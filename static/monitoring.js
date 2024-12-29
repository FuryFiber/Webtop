const currentUsagePlugin = {
    id: 'currentUsagePlugin',
    beforeDraw: (chart) => {
        const ctx = chart.ctx;
        const dataset = chart.data.datasets[0].data;
        const currentValue = dataset[dataset.length - 1]; // Get the last value

        ctx.save();
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        // Position the value near the top right
        const { top, right } = chart.chartArea;
        ctx.fillText(`Usage: ${Math.round(currentValue * 100) / 100} %`, right-150, top - 10);

        ctx.restore();
    }
};

const currentSpeedPlugin = {
    id: 'currentSpeedPlugin',
    beforeDraw: (chart) => {
        const ctx = chart.ctx;
        const up_data = chart.data.datasets[0].data;
        const down_data = chart.data.datasets[1].data;
        const up_speed = up_data[up_data.length - 1]; // Get the last value
        const down_speed = down_data[down_data.length - 1]; // Get the last value

        ctx.save();
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        // Position the value near the top right
        const { top, right } = chart.chartArea;
        ctx.fillText(`Up: ${Math.round(up_speed * 100) / 100} KiB/s`, right-150, top -10);
        ctx.fillText(`Down: ${Math.round(down_speed * 100) / 100} KiB/s`, right-150, top +20);

        ctx.restore();
    }
};
// Set up Chart.js for Memory Usage
const memoryCtx = document.getElementById('memoryChart').getContext('2d');
const memoryChart = new Chart(memoryCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Memory Usage (%)',
            data: [],
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
            tension: 0.1
        }]
    },
    options: {
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                title: {
                    display: false,
                    text: 'Time (s)'
                },
                ticks: {
                    display: false
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Memory Usage (%)'
                },
                min: 0,
                max: 100
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true
            }
        }
    },
    plugins: [currentUsagePlugin]
});

// Set up Chart.js for CPU Usage
const cpuCtx = document.getElementById('cpuChart').getContext('2d');
const cpuChart = new Chart(cpuCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'CPU Usage (%)',
            data: [],
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
            tension: 0.1
        }]
    },
    options: {
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                title: {
                    display: false,
                    text: 'Time (s)'
                },
                ticks: {
                    display: false
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'CPU Usage (%)'
                },
                min: 0,
                max: 100
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true
            }
        },
    },
    plugins: [currentUsagePlugin]
});

// Set up Chart.js for Network Up Speed
const upSpeedCtx = document.getElementById('upSpeedChart').getContext('2d');
const upSpeedChart = new Chart(upSpeedCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Up Speed (KiB/s)',
            data: [],
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            fill: true,
            tension: 0.1
        },
            {
                label: 'Down Speed (KiB/s)',
                data: [],
                borderColor: 'rgba(255, 159, 64, 1)',
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                fill: true,
                tension: 0.1
            }]
    },
    options: {
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                title: {
                    display: false,
                    text: 'Time (s)'
                },
                ticks: {
                    display: false
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Speed (KiB/s)'
                }
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true
            }
        }
    },
    plugins: [currentSpeedPlugin]
});

let refreshInterval = 2500;


async function fetchHistory() {
    try {
        // Fetch the historical data from the backend
        const response = await fetch('/system_metrics');
        const data = await response.json();

        // Populate the memory chart with historical data
        memoryChart.data.labels = data.memory_history.map((_, i) => i); // Time labels
        memoryChart.data.datasets[0].data = data.memory_history;

        // Populate the CPU chart with historical data
        cpuChart.data.labels = data.cpu_history.map((_, i) => i); // Time labels
        cpuChart.data.datasets[0].data = data.cpu_history;

        // Update network interface list if not already done
        // Populate the dropdown with network interface options (if not already populated)
        const networkSelect = document.getElementById('networkInterface');
        if (networkSelect.options.length === 0) {
            data.networks.forEach(network => {
                const option = document.createElement('option');
                option.value = network.name;
                option.textContent = network.name;
                networkSelect.appendChild(option);
            });
        }
        // Get the selected network interface
        const selectedInterface = networkSelect.value;
        const networkHistory = data.network_history[selectedInterface]; // Access its history

        const totalTransmitted = networkHistory.up; // Extract total transmitted
        const totalReceived = networkHistory.down; // Extract total received

        // Calculate speeds (assuming evenly spaced intervals between records)
        const upSpeeds = totalTransmitted.map((value, index) => index === 0 ? 0 : (value - totalTransmitted[index - 1]) / 1024); // Convert to KiB/s
        const downSpeeds = totalReceived.map((value, index) => index === 0 ? 0 : (value - totalReceived[index - 1]) / 1024); // Convert to KiB/s

        // Populate the chart
        upSpeedChart.data.labels = upSpeeds.map((_, i) => i); // Time labels
        upSpeedChart.data.datasets[0].data = upSpeeds; // Up speeds
        upSpeedChart.data.datasets[1].data = downSpeeds; // Down speeds

        // Update the charts after populating them
        memoryChart.update();
        cpuChart.update();
        upSpeedChart.update();
    } catch (error) {
        console.error("Error fetching historical metrics", error);
    }
}
async function fetchMetrics() {
    try {
        const response = await fetch('/system_metrics');
        const data = await response.json();

        // Add a new memory data point
        const newMemoryPoint = data.memory_history[data.memory_history.length - 1];
        if (data.memory_history.length < 50){
            memoryChart.data.labels = data.memory_history.map((_, i) => i); // Time labels
            memoryChart.data.datasets[0].data.push(newMemoryPoint); // Add the new data point
        }
        else {
            memoryChart.data.datasets[0].data.shift(); // Remove the first data point
            memoryChart.data.datasets[0].data.push(newMemoryPoint);
        }

        // Add a new CPU data point
        const newCpuPoint = data.cpu_history[data.cpu_history.length - 1];
        if (data.cpu_history.length < 50){
            cpuChart.data.labels = data.cpu_history.map((_, i) => i); // Time labels
            cpuChart.data.datasets[0].data.push(newCpuPoint); // Add the new data point
        }
        else {
            cpuChart.data.datasets[0].data.shift(); // Remove the first data point
            cpuChart.data.datasets[0].data.push(newCpuPoint);
        }

        // Update network interface list if not already done
        // Populate the dropdown with network interface options (if not already populated)
        const networkSelect = document.getElementById('networkInterface');
        if (networkSelect.options.length === 0) {
            data.networks.forEach(network => {
                const option = document.createElement('option');
                option.value = network.name;
                option.textContent = network.name;
                networkSelect.appendChild(option);
            });
        }
        // Get the selected network interface
        const selectedInterface = networkSelect.value;
        const networkHistory = data.network_history[selectedInterface]; // Access its history

        const totalTransmitted = networkHistory.up; // Extract total transmitted
        const totalReceived = networkHistory.down; // Extract total received

        // Calculate the latest speeds (assuming last entry is the newest)
        const newUpSpeed = (totalTransmitted[totalTransmitted.length - 1] - totalTransmitted[totalTransmitted.length - 2]) / 1024; // Convert to KiB/s
        const newDownSpeed = (totalReceived[totalReceived.length - 1] - totalReceived[totalReceived.length - 2]) / 1024; // Convert to KiB/s

        if (totalTransmitted.length < 50){
            upSpeedChart.data.labels = totalTransmitted.map((_, i) => i); // Time labels
            upSpeedChart.data.datasets[0].data.push(newUpSpeed); // Add the new data point
            upSpeedChart.data.datasets[1].data.push(newDownSpeed); // Add the new data point
        }
        else {
            upSpeedChart.data.datasets[0].data.shift(); // Remove the first data point
            upSpeedChart.data.datasets[0].data.push(newUpSpeed);
            upSpeedChart.data.datasets[1].data.shift(); // Remove the first data point
            upSpeedChart.data.datasets[1].data.push(newDownSpeed);
        }

        // Refresh the charts
        memoryChart.update();
        cpuChart.update();
        upSpeedChart.update();

        // Update CPU threads list
        const cpuThreadsTableBody = document.getElementById('cpuThreadsTableBody');
        cpuThreadsTableBody.innerHTML = ''; // Clear the existing table rows

        data.cpus.forEach((cpu, index) => {
            const row = document.createElement('tr');

            // Thread name
            const threadNameCell = document.createElement('td');
            threadNameCell.textContent = `T${index + 1}`;
            row.appendChild(threadNameCell);

            // Usage percentage
            const usageCell = document.createElement('td');
            usageCell.textContent = `${Math.round(cpu)}%`;
            row.appendChild(usageCell);

            // Progress bar
            const progressCell = document.createElement('td');
            const progressBarContainer = document.createElement('div');
            progressBarContainer.classList.add('cpu-progress-bar-container');
            const progressBar = document.createElement('div');
            progressBar.classList.add('cpu-progress-bar');
            progressBar.style.width = `${Math.round(cpu)}%`;

            const cpuLoad = Math.round(cpu);
            if (cpuLoad < 50) {
                progressBar.style.backgroundColor = `rgb(${0 + (cpuLoad * 5)}, 255, 0)`; // Green to Yellow
            } else {
                progressBar.style.backgroundColor = `rgb(255, ${255 - ((cpuLoad - 50) * 5)}, 0)`; // Yellow to Red
            }

            progressBarContainer.appendChild(progressBar);
            progressCell.appendChild(progressBarContainer);
            row.appendChild(progressCell);

            cpuThreadsTableBody.appendChild(row);
        });

        // Update the disk usage progress bars
        const diskListContainer = document.getElementById('diskList');
        diskListContainer.innerHTML = ''; // Clear previous content

        data.disks.forEach(disk => {
            const diskItem = document.createElement('div');
            diskItem.classList.add('disk-item');

            const diskName = document.createElement('div');
            diskName.classList.add('disk-name');
            diskName.textContent = disk.name;

            const progressBarContainer = document.createElement('div');
            progressBarContainer.classList.add('progress-bar-container');
            const progressBar = document.createElement('div');
            progressBar.classList.add('progress-bar');
            progressBar.style.width = `${((disk.total_space - disk.available_space) / disk.total_space) * 100}%`;
            progressBarContainer.appendChild(progressBar);

            const diskSpaceInfo = document.createElement('div');
            diskSpaceInfo.classList.add('disk-space-info');
            diskSpaceInfo.textContent = `${((disk.total_space - disk.available_space) / 1024 / 1024 / 1024).toFixed(2)} GB / ${(disk.total_space / 1024 / 1024 / 1024).toFixed(2)} GB`;

            diskItem.appendChild(diskName);
            diskItem.appendChild(progressBarContainer);
            diskItem.appendChild(diskSpaceInfo);

            diskListContainer.appendChild(diskItem);
        });

    } catch (error) {
        console.error("Error fetching system metrics", error);
    }
}

function startFetchingMetrics() {
    setInterval(fetchMetrics, refreshInterval); // Set the new interval
}

async function initializeCharts() {
    await fetchHistory(); // Populate the graphs with historical data
    //setInterval(fetchLatest, refreshInterval); // Start fetching latest data points periodically
}



// Event listener for applying a new refresh rate
document.getElementById('applyRate').addEventListener('click', () => {
    const input = document.getElementById('refreshRate');
    const newRate = parseInt(input.value, 10);

    if (newRate >= 500) { // Set a minimum refresh rate of 500ms
        refreshInterval = newRate;
        clearInterval(intervalId); // Clear the previous interval
        intervalId = setInterval(fetchMetrics, refreshInterval); // Apply the new interval
    } else {
        alert('Please enter a value of at least 500 ms');
    }
});


startFetchingMetrics();
initializeCharts();
