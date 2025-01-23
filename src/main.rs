use std::collections::HashMap;
use sysinfo::{System, Disks, Networks};
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
    disk_history: HashMap<String, DiskHistory>
}

#[derive(Serialize)]
struct SystemGeneral {
    name: String,
    kernel_version: String,
    os_version: String,
    hostname: String,
    total_memory: u64,
    cpus: u64,
    uptime: String,
}

#[derive(Serialize, Debug)]
struct DiskInfo {
    name: String,
    total_space: u64,
    available_space: u64,
}

#[derive(Serialize, Debug, Clone)]
struct DiskHistory {
    read_history: Vec<u64>,
    write_history: Vec<u64>,
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
    disks: Disks,
    networks: Networks,
    memory_history: Vec<f32>,
    cpu_history: Vec<f32>,
}

fn format_time(secs: u64) -> String {
    let hours = secs / 3600;
    let minutes = (secs % 3600) / 60;
    let seconds = secs % 60;

    format!("{}:{}:{}", hours, minutes, seconds)
}

#[tokio::main]
async fn main() {
    let metrics_state = Arc::new(Mutex::new(MetricsState {
        system: System::new_all(),
        disks: Disks::new_with_refreshed_list(),
        networks: Networks::new_with_refreshed_list(),
        memory_history: Vec::new(),
        cpu_history: Vec::new(),
    }));

    let network_state = Arc::new(Mutex::new(HashMap::new()));
    let disk_state = Arc::new(Mutex::new(HashMap::new()));

    // Endpoint to fetch system metrics
    let metrics_state_clone = metrics_state.clone();
    let network_state_clone = network_state.clone();
    let disk_state_clone = disk_state.clone();
    let system_metrics_route = warp::path("system_metrics")
        .and(warp::get())
        .map(move || {
            let mut state = metrics_state_clone.lock().unwrap();
            let mut network_state_inner = network_state_clone.lock().unwrap();
            let mut disk_state_inner = disk_state_clone.lock().unwrap();
            state.system.refresh_all();

            let cpu_usage = state.system.global_cpu_usage();
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
            let disks: Vec<DiskInfo> = state.disks.iter().map(|disk| {
                DiskInfo {
                    name: disk.name().to_string_lossy().into(),
                    total_space: disk.total_space(),
                    available_space: disk.available_space(),
                }
            }).collect();

            // Update disk history
            for disk in state.disks.list(){
                let prev = disk_state_inner.entry(disk.name().to_string_lossy().into())
                    .or_insert(DiskHistory {
                        read_history: Vec::new(),
                        write_history: Vec::new(),
                    });

                prev.read_history.push(disk.usage().total_read_bytes);
                prev.write_history.push(disk.usage().total_written_bytes);

                if prev.read_history.len() > 50 {
                    prev.read_history.remove(0);
                }
                if prev.write_history.len() > 50 {
                    prev.write_history.remove(0);
                }
            }

            // Gather network information
            let networks: Vec<NetworkInfo> = state.networks.iter().map(|(name, data)| {
                NetworkInfo {
                    name: name.clone(),
                    up: data.total_transmitted(),
                    down: data.total_received()
                }
            }).collect();

            // Update network history
            for (name, data) in state.networks.iter() {
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
                network_history: network_state_inner.clone(),
                disk_history: disk_state_inner.clone(),
            };

            warp::reply::json(&metrics)
        });

    let system_genera_clone = metrics_state.clone();
    let system_general_route = warp::path("system_general")
        .and(warp::get())
        .map(move || {
            let state = system_genera_clone.lock().unwrap();
            let system_general = SystemGeneral{
                name: System::name().unwrap_or("".to_string()),
                kernel_version: System::kernel_version().unwrap_or("".to_string()),
                os_version: System::os_version().unwrap_or("".to_string()),
                hostname: System::host_name().unwrap_or("".to_string()),
                total_memory: state.system.total_memory(),
                cpus: state.system.cpus().len() as u64,
                uptime: format_time(System::uptime())
            };

            warp::reply::json(&system_general)
        });

    // Serve static HTML/JS
    let index = warp::path::end()
        .and(warp::fs::file("index.html"));
    let static_files = warp::path("static")
        .and(warp::fs::dir("static"));

    // Combine routes
    let routes = system_metrics_route.or(system_general_route).or(index).or(static_files);

    // Periodically refresh system info
    let metrics_state_updater = metrics_state.clone();
    tokio::spawn(async move {
        loop {
            {
                let mut state = metrics_state_updater.lock().unwrap();
                state.system.refresh_all();
                state.networks.refresh(true);
                state.disks.refresh(true);
            }
            sleep(Duration::from_millis(500)).await;
        }
    });

    // Start server
    println!("Server running on http://127.0.0.1:3030");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}
