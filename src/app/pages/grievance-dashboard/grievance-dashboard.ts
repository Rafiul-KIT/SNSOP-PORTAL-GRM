import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { ApiService } from '../../services/api.service';

interface StatusCount {
  status: string;
  count: number;
}

interface TypeCount {
  type?: string;
  referralService?: string;
  title?: string;
  count: number;
}

interface LocationCount {
  state?: string;
  county?: string;
  payam?: string;
  boma?: string;
  count: number;
}

interface ResolutionTime {
  state?: string;
  county?: string;
  payam?: string;
  boma?: string;
  averageResolutionTime: number;
}

interface DashboardData {
  grievancesByStatus: StatusCount[];
  grievancesByType?: TypeCount[];
  grievancesByLocation: LocationCount[];
  averageResolutionTimeByLocation: ResolutionTime[];
  typesOfReferralMade?: TypeCount[];
  sentToReferralServices?: TypeCount[];
  perpetratorAssociatedWithProject?: TypeCount[];
}

interface ApiResponse {
  ngbvData: DashboardData;
  gbvData: DashboardData;
}

@Component({
  selector: 'app-grievance-dashboard',
  imports: [CommonModule, ChartModule, CardModule, TabsModule],
  templateUrl: './grievance-dashboard.html',
  styleUrl: './grievance-dashboard.scss',
})
export class GrievanceDashboard implements OnInit {
  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  error: string | null = null;

  // Data
  apiResponse: ApiResponse | null = null;
  activeTab = '0';

  // NGBV Stats
  ngbvTotalCases = 0;
  ngbvPendingCases = 0;
  ngbvResolvedCases = 0;
  ngbvAvgResolutionTime = 0;

  // GBV Stats
  gbvTotalCases = 0;
  gbvPendingCases = 0;
  gbvResolvedCases = 0;
  gbvAvgResolutionTime = 0;

  // Chart data
  ngbvStatusChartData: any;
  ngbvTypeChartData: any;
  ngbvLocationChartData: any;
  ngbvResolutionChartData: any;

  gbvStatusChartData: any;
  gbvLocationChartData: any;
  gbvResolutionChartData: any;
  gbvReferralChartData: any;
  gbvReferralServiceChartData: any;
  gbvPerpetratorChartData: any;

  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { size: 12, family: "'Inter', sans-serif" },
          color: '#475569',
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 13, family: "'Inter', sans-serif" },
        bodyFont: { size: 12, family: "'Inter', sans-serif" },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
      },
    },
  };

  barChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 13, family: "'Inter', sans-serif" },
        bodyFont: { size: 12, family: "'Inter', sans-serif" },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: '#f1f5f9', drawBorder: false },
        ticks: { color: '#94a3b8', font: { size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#475569', font: { size: 12, weight: '500' } },
      },
    },
  };

  ngOnInit() {
    this.fetchDashboardData();
  }

  async fetchDashboardData() {
    try {
      const response = await this.apiService.GET<ApiResponse>('/api/grievance/dashboard');
      this.apiResponse = response.data;
      this.processNGBVData();
      this.processGBVData();
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      this.error = 'Failed to load dashboard data. Please try again later.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  processNGBVData() {
    const data = this.apiResponse?.ngbvData;
    if (!data) return;

    this.ngbvTotalCases = this.sumCount(data.grievancesByStatus ?? []);
    this.ngbvPendingCases = this.sumByStatus(data.grievancesByStatus ?? [], ['Pending', 'In Progress', 'Open', 'New']);
    this.ngbvResolvedCases = this.sumByStatus(data.grievancesByStatus ?? [], ['Resolved', 'Closed', 'Completed']);
    this.ngbvAvgResolutionTime = this.calculateAvgResolutionTime(data.averageResolutionTimeByLocation ?? []);

    this.ngbvStatusChartData = this.createStatusChart(data.grievancesByStatus ?? []);

    if (data.grievancesByType && data.grievancesByType.length > 0) {
      this.ngbvTypeChartData = this.createTypeChart(data.grievancesByType);
    }

    this.ngbvLocationChartData = this.createLocationChart(data.grievancesByLocation ?? []);
    this.ngbvResolutionChartData = this.createResolutionTimeChart(data.averageResolutionTimeByLocation ?? []);
  }

  processGBVData() {
    const data = this.apiResponse?.gbvData;
    if (!data) return;

    this.gbvTotalCases = this.sumCount(data.grievancesByStatus ?? []);
    this.gbvPendingCases = this.sumByStatus(data.grievancesByStatus ?? [], ['Pending', 'In Progress', 'Open', 'New']);
    this.gbvResolvedCases = this.sumByStatus(data.grievancesByStatus ?? [], ['Resolved', 'Closed', 'Completed']);
    this.gbvAvgResolutionTime = this.calculateAvgResolutionTime(data.averageResolutionTimeByLocation ?? []);

    this.gbvStatusChartData = this.createStatusChart(data.grievancesByStatus ?? []);
    this.gbvLocationChartData = this.createLocationChart(data.grievancesByLocation ?? []);
    this.gbvResolutionChartData = this.createResolutionTimeChart(data.averageResolutionTimeByLocation ?? []);

    if (data.typesOfReferralMade && data.typesOfReferralMade.length > 0) {
      this.gbvReferralChartData = this.createTypeChart(data.typesOfReferralMade);
    }

    if (data.sentToReferralServices && data.sentToReferralServices.length > 0) {
      this.gbvReferralServiceChartData = this.createTypeChart(data.sentToReferralServices);
    }

    if (data.perpetratorAssociatedWithProject && data.perpetratorAssociatedWithProject.length > 0) {
      this.gbvPerpetratorChartData = this.createTypeChart(data.perpetratorAssociatedWithProject);
    }
  }

  private sumCount(items: { count: number }[]): number {
    return items.reduce((sum, item) => sum + (item.count || 0), 0);
  }

  private sumByStatus(items: StatusCount[], statusKeywords: string[]): number {
    return items
      .filter((item) => statusKeywords.some((kw) => item.status?.toLowerCase().includes(kw.toLowerCase())))
      .reduce((sum, item) => sum + (item.count || 0), 0);
  }

  private calculateAvgResolutionTime(items: ResolutionTime[]): number {
    if (!items || !items.length) return 0;
    const validItems = items.filter((i) => i.averageResolutionTime > 0);
    if (!validItems.length) return 0;
    return validItems.reduce((sum, item) => sum + item.averageResolutionTime, 0) / validItems.length;
  }

  private createStatusChart(items: StatusCount[]): any {
    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    return {
      labels: items.map((i) => i.status || 'Unknown'),
      datasets: [
        {
          data: items.map((i) => i.count),
          backgroundColor: colors.slice(0, items.length),
          hoverBackgroundColor: colors.slice(0, items.length).map(c => c + 'dd'),
          borderWidth: 0,
          borderRadius: 4,
        },
      ],
    };
  }

  private createTypeChart(items: TypeCount[]): any {
    const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];
    return {
      labels: items.map((i) => i.type || i.referralService || i.title || 'Unknown'),
      datasets: [
        {
          data: items.map((i) => i.count),
          backgroundColor: colors.slice(0, items.length),
          hoverBackgroundColor: colors.slice(0, items.length).map(c => c + 'dd'),
          borderWidth: 0,
        },
      ],
    };
  }

  private createLocationChart(items: LocationCount[]): any {
    const sorted = [...items].sort((a, b) => b.count - a.count).slice(0, 10);
    return {
      labels: sorted.map((i) => i.county || i.state || i.payam || i.boma || 'Unknown'),
      datasets: [
        {
          label: 'Cases',
          data: sorted.map((i) => i.count),
          backgroundColor: 'rgba(99, 102, 241, 0.85)',
          hoverBackgroundColor: 'rgba(99, 102, 241, 1)',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }

  private createResolutionTimeChart(items: ResolutionTime[]): any {
    const sorted = [...items]
      .filter((i) => i.averageResolutionTime > 0)
      .sort((a, b) => b.averageResolutionTime - a.averageResolutionTime)
      .slice(0, 8);
    return {
      labels: sorted.map((i) => i.county || i.state || i.payam || i.boma || 'Unknown'),
      datasets: [
        {
          label: 'Avg Days',
          data: sorted.map((i) => Math.round(i.averageResolutionTime * 10) / 10),
          backgroundColor: sorted.map((i) =>
            i.averageResolutionTime > 7 ? 'rgba(239, 68, 68, 0.85)' : i.averageResolutionTime > 4 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(16, 185, 129, 0.85)'
          ),
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }

  formatResolutionTime(days: number): string {
    if (!days) return 'N/A';
    return days.toFixed(1) + ' days';
  }
}
