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
        ctx.fillText(`Up: ${Math.round(up_speed * 100) / 100} KiB/s`, right-130, top -10);
        ctx.fillText(`Down: ${Math.round(down_speed * 100) / 100} KiB/s`, right-130, top +20);

        ctx.restore();
    }
};
// Set up Chart.js for Memory Usage
const memoryCtx = document.getElementById('memoryChart').getContext('2d');
export const memoryChart = new Chart(memoryCtx, {
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
export const cpuChart = new Chart(cpuCtx, {
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
export const upSpeedChart = new Chart(upSpeedCtx, {
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
// Set up Chart.js for Network Up Speed
const diskSpeedCtx = document.getElementById('diskSpeedChart').getContext('2d');
export const diskSpeedChart = new Chart(diskSpeedCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Read Speed (KiB/s)',
            data: [],
            borderColor: 'rgb(67,201,105)',
            backgroundColor: 'rgba(67, 201, 105, 0.2)',
            fill: true,
            tension: 0.1
        },
        {
            label: 'Write Speed (KiB/s)',
            data: [],
            borderColor: 'rgb(255,64,64)',
            backgroundColor: 'rgba(255, 64, 64, 0.2)',
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