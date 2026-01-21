import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, ChartModule, CardModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  // Stats cards data
  statsCards = [
    {
      title: 'Total Grievances',
      value: 1248,
      icon: 'bi-file-earmark-text',
      trend: '+12%',
      trendUp: true,
      color: 'primary',
    },
    {
      title: 'Pending Cases',
      value: 342,
      icon: 'bi-hourglass-split',
      trend: '-8%',
      trendUp: false,
      color: 'warning',
    },
    {
      title: 'Resolved Cases',
      value: 856,
      icon: 'bi-check-circle',
      trend: '+24%',
      trendUp: true,
      color: 'success',
    },
    {
      title: 'GBV Cases',
      value: 50,
      icon: 'bi-shield-exclamation',
      trend: '-5%',
      trendUp: false,
      color: 'danger',
    },
  ];

  // Bar chart - County wise data
  barChartData: any;
  barChartOptions: any;

  // Doughnut chart data
  doughnutChartData: any;
  doughnutChartOptions: any;

  // Monthly trend chart
  lineChartData: any;
  lineChartOptions: any;

  ngOnInit() {
    this.initBarChart();
    this.initDoughnutChart();
    this.initLineChart();
  }

  initBarChart() {
    this.barChartData = {
      labels: [
        'Nairobi',
        'Mombasa',
        'Kisumu',
        'Nakuru',
        'Eldoret',
        'Machakos',
        'Nyeri',
        'Garissa',
      ],
      datasets: [
        {
          label: 'Total Cases',
          backgroundColor: '#6366f1',
          borderRadius: 8,
          data: [245, 189, 156, 142, 128, 98, 87, 65],
        },
        {
          label: 'Resolved',
          backgroundColor: '#22c55e',
          borderRadius: 8,
          data: [198, 145, 120, 110, 95, 72, 65, 51],
        },
        {
          label: 'Pending',
          backgroundColor: '#f59e0b',
          borderRadius: 8,
          data: [47, 44, 36, 32, 33, 26, 22, 14],
        },
      ],
    };

    this.barChartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 1.5,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 11,
            },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#e5e7eb',
          },
          ticks: {
            font: {
              size: 11,
            },
          },
        },
      },
    };
  }

  initDoughnutChart() {
    this.doughnutChartData = {
      labels: ['Resolved', 'In Progress', 'Pending', 'Escalated'],
      datasets: [
        {
          data: [856, 198, 144, 50],
          backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
          hoverBackgroundColor: ['#16a34a', '#2563eb', '#d97706', '#dc2626'],
          borderWidth: 0,
        },
      ],
    };

    this.doughnutChartOptions = {
      cutout: '65%',
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
            },
          },
        },
      },
    };
  }

  initLineChart() {
    this.lineChartData = {
      labels: [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ],
      datasets: [
        {
          label: 'Cases Received',
          data: [65, 78, 92, 85, 110, 125, 98, 115, 130, 142, 128, 156],
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderColor: '#6366f1',
          tension: 0.4,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
        {
          label: 'Cases Resolved',
          data: [55, 68, 82, 75, 95, 110, 88, 102, 118, 128, 115, 140],
          fill: true,
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderColor: '#22c55e',
          tension: 0.4,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    };

    this.lineChartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#e5e7eb',
          },
        },
      },
    };
  }
}
