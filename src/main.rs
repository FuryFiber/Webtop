use sysinfo::{System, SystemExt, CpuExt, DiskExt,  NetworksExt, NetworkExt};
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
    networks: Vec<NetworkInfo>
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

#[tokio::main]
async fn main() {
    let sysinfo = Arc::new(Mutex::new(
        System::new_all()
    ));

    // Endpoint to fetch system metrics
    let sysinfo_clone = sysinfo.clone();
    let system_metrics_route = warp::path("system_metrics")
        .and(warp::get())
        .map(move || {
            let mut system = sysinfo_clone.lock().unwrap();
            system.refresh_all();

            let cpu_usage = system.global_cpu_info().cpu_usage();
            let mut cpus = Vec::new();
            for cpu in system.cpus() {
                cpus.push(cpu.cpu_usage())
            }


            // Gather disk information
            let disks: Vec<DiskInfo> = system.disks().iter().map(|disk| {
                DiskInfo {
                    name: disk.name().to_string_lossy().into(),
                    total_space: disk.total_space(),
                    available_space: disk.available_space(),
                }
            }).collect();

            // Gather network information
            let networks: Vec<NetworkInfo> = system.networks().iter().map(|(name, data)| {
                NetworkInfo {
                    name: name.clone(),
                    up: data.total_transmitted(),
                    down: data.total_received()
                }
            }).collect();

            let metrics = SystemMetrics {
                total_memory: system.total_memory(),
                used_memory: system.used_memory(),
                cpu_usage,
                cpus,
                disks,
                networks
            };

            warp::reply::json(&metrics)
        });

    // Serve static HTML/JS
    let html = warp::path::end()
        .and(warp::fs::file("index.html"));

    // Combine routes
    let routes = system_metrics_route.or(html);

    // Periodically refresh system info
    let sysinfo_updater = sysinfo.clone();
    tokio::spawn(async move {
        loop {
            {
                let mut system = sysinfo_updater.lock().unwrap();
                system.refresh_all();
            }
            sleep(Duration::from_millis(2500)).await;
        }
    });

    // Start server
    println!("Server running on http://127.0.0.1:3030");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}
