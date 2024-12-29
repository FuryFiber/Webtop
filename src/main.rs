use std::collections::HashMap;
use sysinfo::{System, SystemExt, CpuExt, DiskExt, NetworksExt, NetworkExt};
use warp::Filter;
use serde::Serialize;
use std::sync::{Arc, Mutex};
use tokio::time::{sleep, Duration};

#[derive(Serialize)]
struct SystemMetrics {
    total_memory: u64,
    used_memory: u64,
    cpu_usage: f32,
    cpus: Vec<f32>,
    disks: Vec<DiskInfo>,
    networks: Vec<NetworkInfo>,
    memory_history: Vec<f32>,
    cpu_history: Vec<f32>,
    network_history: HashMap<String, NetworkHistory>,
}

#[derive(Serialize, Debug)]
struct DiskInfo {
    name: String,
    total_space: u64,
    available_space: u64,
}

#[derive(Serialize, Debug)]
struct NetworkInfo {
    name: String,
    down: u64,
    up: u64,
}

#[derive(Serialize, Debug, Clone)]
struct NetworkHistory {
    up: Vec<u64>,
    down: Vec<u64>,
}

struct MetricsState {
    system: System,
    memory_history: Vec<f32>,
    cpu_history: Vec<f32>,
}

#[tokio::main]
async fn main() {
    let metrics_state = Arc::new(Mutex::new(MetricsState {
        system: System::new_all(),
        memory_history: Vec::new(),
        cpu_history: Vec::new(),
    }));

    let network_state = Arc::new(Mutex::new(HashMap::new()));

    // Endpoint to fetch system metrics
    let metrics_state_clone = metrics_state.clone();
    let network_state_clone = network_state.clone();
    let system_metrics_route = warp::path("system_metrics")
        .and(warp::get())
        .map(move || {
            let mut state = metrics_state_clone.lock().unwrap();
            let mut network_state_inner = network_state_clone.lock().unwrap();
            state.system.refresh_all();

            let cpu_usage = state.system.global_cpu_info().cpu_usage();
            let mut cpus = Vec::new();
            for cpu in state.system.cpus() {
                cpus.push(cpu.cpu_usage())
            }

            // Update memory history
            let memory_usage = (state.system.used_memory() as f32 / state.system.total_memory() as f32) * 100.0;
            state.memory_history.push(memory_usage);
            if state.memory_history.len() > 50 {
                state.memory_history.remove(0);
            }

            // Update CPU usage history
            state.cpu_history.push(cpu_usage);
            if state.cpu_history.len() > 50 {
                state.cpu_history.remove(0);
            }

            // Gather disk information
            let disks: Vec<DiskInfo> = state.system.disks().iter().map(|disk| {
                DiskInfo {
                    name: disk.name().to_string_lossy().into(),
                    total_space: disk.total_space(),
                    available_space: disk.available_space(),
                }
            }).collect();

            // Gather network information
            let networks: Vec<NetworkInfo> = state.system.networks().iter().map(|(name, data)| {
                NetworkInfo {
                    name: name.clone(),
                    up: data.total_transmitted(),
                    down: data.total_received()
                }
            }).collect();

            // Update network history
            for (name, data) in state.system.networks() {
                let prev = network_state_inner.entry(name.clone())
                    .or_insert(NetworkHistory {
                        up: Vec::new(),
                        down: Vec::new(),
                    });

                prev.up.push(data.total_transmitted());
                prev.down.push(data.total_received());

                if prev.up.len() > 50 {
                    prev.up.remove(0);
                }
                if prev.down.len() > 50 {
                    prev.down.remove(0);
                }
            }

            let metrics = SystemMetrics {
                total_memory: state.system.total_memory(),
                used_memory: state.system.used_memory(),
                cpu_usage,
                cpus,
                disks,
                networks,
                memory_history: state.memory_history.clone(),
                cpu_history: state.cpu_history.clone(),
                network_history: network_state_inner.clone()
            };

            warp::reply::json(&metrics)
        });

    // Serve static HTML/JS
    let index = warp::path::end()
        .and(warp::fs::file("index.html"));
    let static_files = warp::path("static")
        .and(warp::fs::dir("static"));

    // Combine routes
    let routes = system_metrics_route.or(index).or(static_files);

    // Periodically refresh system info
    let metrics_state_updater = metrics_state.clone();
    tokio::spawn(async move {
        loop {
            {
                let mut state = metrics_state_updater.lock().unwrap();
                state.system.refresh_all();
            }
            sleep(Duration::from_millis(500)).await;
        }
    });

    // Start server
    println!("Server running on http://127.0.0.1:3030");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}
