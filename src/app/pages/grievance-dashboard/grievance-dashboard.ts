import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { ApiService } from '../../services/api.service';
import { Loader } from "../../components/loader/loader";

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
  imports: [CommonModule, ChartModule, CardModule, TabsModule, Loader],
  templateUrl: './grievance-dashboard.html',
  styleUrl: './grievance-dashboard.scss',
})
export class GrievanceDashboard implements OnInit {
  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private readonly brandPalette = ['#00b579', '#f06292', '#0dcaf0'];
  private readonly extendedPalette = [
    '#00b579',
    '#f06292',
    '#0dcaf0',
    '#34d399',
    '#f48fb1',
    '#67e8f9',
    '#059669',
    '#ec4899',
    '#0891b2',
    '#6ee7b7',
    '#fbcfe8',
    '#a5f3fc',
  ];

  loading = true;
  error: string | null = null;

  // Data
  apiResponse: ApiResponse | null = null;
  activeTab = '0';

  // NGBV Stats
  ngbvTotalCases = 0;
  ngbvPendingCases = 0;
  ngbvResolvedCases = 0;
  ngbvResolvedPercentage = 0;
  ngbvAvgResolutionTime = 0;

  // GBV Stats
  gbvTotalCases = 0;
  gbvPendingCases = 0;
  gbvResolvedCases = 0;
  gbvResolvedPercentage = 0;
  gbvAvgResolutionTime = 0;

  // Combined Stats
  allTotalCases = 0;
  allPendingCases = 0;
  allResolvedCases = 0;
  allResolvedPercentage = 0;
  allAvgResolutionTime = 0;

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

  allStatusChartData: any;
  allLocationChartData: any;
  allResolutionChartData: any;

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
          color: '#334155',
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
        grid: { color: 'rgba(148, 163, 184, 0.15)', drawBorder: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#334155', font: { size: 12, weight: '500' } },
      },
    },
  };

  locationBarChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#475569',
          boxWidth: 12,
          boxHeight: 12,
          padding: 14,
          font: { size: 12, family: "'Inter', sans-serif", weight: '600' },
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 13, family: "'Inter', sans-serif" },
        bodyFont: { size: 12, family: "'Inter', sans-serif" },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => `Cases: ${Number(ctx.raw || 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(203, 213, 225, 0.55)', drawBorder: false },
        ticks: {
          color: '#475569',
          font: { size: 11, weight: '500' },
          maxRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        grace: '10%',
        grid: { color: 'rgba(203, 213, 225, 0.55)', drawBorder: false },
        ticks: {
          color: '#475569',
          font: { size: 11 },
          precision: 0,
          callback: (value: any) => Number(value).toLocaleString(),
        },
      },
    },
  };

  ngOnInit() {
    this.fetchDashboardData();
  }

  async fetchDashboardData() {
    try {
      const response = await this.apiService.GET<ApiResponse>(
        '/api/grievance/dashboard',
      );
      this.apiResponse = response.data;
      this.processNGBVData();
      this.processGBVData();
      this.processCombinedData();
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
    this.ngbvPendingCases = this.sumByStatus(data.grievancesByStatus ?? [], [
      'Pending',
      'In Progress',
      'Open',
      'New',
    ]);
    this.ngbvResolvedCases = this.sumByStatus(data.grievancesByStatus ?? [], [
      'Resolved',
      'Closed',
      'Completed',
    ]);
    this.ngbvResolvedPercentage = this.calculateResolvedPercentage(
      this.ngbvResolvedCases,
      this.ngbvTotalCases,
    );
    this.ngbvAvgResolutionTime = this.calculateAvgResolutionTime(
      data.averageResolutionTimeByLocation ?? [],
    );

    this.ngbvStatusChartData = this.createStatusChart(
      data.grievancesByStatus ?? [],
    );

    if (data.grievancesByType && data.grievancesByType.length > 0) {
      this.ngbvTypeChartData = this.createTypeChart(data.grievancesByType);
    }

    this.ngbvLocationChartData = this.createLocationChart(
      data.grievancesByLocation ?? [],
    );
    this.ngbvResolutionChartData = this.createResolutionTimeChart(
      data.averageResolutionTimeByLocation ?? [],
    );
  }

  processGBVData() {
    const data = this.apiResponse?.gbvData;
    if (!data) return;

    this.gbvTotalCases = this.sumCount(data.grievancesByStatus ?? []);
    this.gbvPendingCases = this.sumByStatus(data.grievancesByStatus ?? [], [
      'Pending',
      'In Progress',
      'Open',
      'New',
    ]);
    this.gbvResolvedCases = this.sumByStatus(data.grievancesByStatus ?? [], [
      'Resolved',
      'Closed',
      'Completed',
    ]);
    this.gbvResolvedPercentage = this.calculateResolvedPercentage(
      this.gbvResolvedCases,
      this.gbvTotalCases,
    );
    this.gbvAvgResolutionTime = this.calculateAvgResolutionTime(
      data.averageResolutionTimeByLocation ?? [],
    );

    this.gbvStatusChartData = this.createStatusChart(
      data.grievancesByStatus ?? [],
    );
    this.gbvLocationChartData = this.createLocationChart(
      data.grievancesByLocation ?? [],
    );
    this.gbvResolutionChartData = this.createResolutionTimeChart(
      data.averageResolutionTimeByLocation ?? [],
    );

    if (data.typesOfReferralMade && data.typesOfReferralMade.length > 0) {
      this.gbvReferralChartData = this.createTypeChart(
        data.typesOfReferralMade,
      );
    }

    if (data.sentToReferralServices && data.sentToReferralServices.length > 0) {
      this.gbvReferralServiceChartData = this.createTypeChart(
        data.sentToReferralServices,
      );
    }

    if (
      data.perpetratorAssociatedWithProject &&
      data.perpetratorAssociatedWithProject.length > 0
    ) {
      this.gbvPerpetratorChartData = this.createTypeChart(
        data.perpetratorAssociatedWithProject,
      );
    }
  }

  processCombinedData() {
    const ngbv = this.apiResponse?.ngbvData;
    const gbv = this.apiResponse?.gbvData;
    if (!ngbv && !gbv) return;

    const combinedStatus = this.mergeStatusCounts(
      ngbv?.grievancesByStatus ?? [],
      gbv?.grievancesByStatus ?? [],
    );
    const combinedLocations = this.mergeLocationCounts(
      ngbv?.grievancesByLocation ?? [],
      gbv?.grievancesByLocation ?? [],
    );
    const combinedResolution = this.mergeResolutionTimes(
      ngbv?.averageResolutionTimeByLocation ?? [],
      gbv?.averageResolutionTimeByLocation ?? [],
    );

    this.allTotalCases = this.sumCount(combinedStatus);
    this.allPendingCases = this.sumByStatus(combinedStatus, [
      'Pending',
      'In Progress',
      'Open',
      'New',
      'Unresolved',
    ]);
    this.allResolvedCases = this.sumByStatus(combinedStatus, [
      'Resolved',
      'Closed',
      'Completed',
    ]);
    this.allResolvedPercentage = this.calculateResolvedPercentage(
      this.allResolvedCases,
      this.allTotalCases,
    );
    this.allAvgResolutionTime = this.calculateAvgResolutionTime(
      combinedResolution,
    );

    this.allStatusChartData = this.createStatusChart(combinedStatus);
    this.allLocationChartData = this.createLocationChart(combinedLocations);
    this.allResolutionChartData = this.createResolutionTimeChart(
      combinedResolution,
    );
  }

  private sumCount(items: { count: number }[]): number {
    return items.reduce((sum, item) => sum + (item.count || 0), 0);
  }

  private sumByStatus(items: StatusCount[], statusKeywords: string[]): number {
    return items
      .filter((item) =>
        statusKeywords.some((kw) =>
          item.status?.toLowerCase().includes(kw.toLowerCase()),
        ),
      )
      .reduce((sum, item) => sum + (item.count || 0), 0);
  }

  private calculateAvgResolutionTime(items: ResolutionTime[]): number {
    if (!items || !items.length) return 0;
    const validItems = items.filter((i) => i.averageResolutionTime > 0);
    if (!validItems.length) return 0;
    return (
      validItems.reduce((sum, item) => sum + item.averageResolutionTime, 0) /
      validItems.length
    );
  }

  private calculateResolvedPercentage(resolved: number, total: number): number {
    if (!total) return 0;
    return (resolved / total) * 100;
  }

  private mergeStatusCounts(
    first: StatusCount[],
    second: StatusCount[],
  ): StatusCount[] {
    const merged = new Map<string, { status: string; count: number }>();
    [...first, ...second].forEach((item) => {
      const rawStatus = (item.status || 'Unknown').trim();
      const lowered = rawStatus.toLowerCase();
      const isReferredVariant =
        lowered.includes('referred') ||
        lowered.includes('refered') ||
        lowered.includes('reffrered') ||
        lowered.includes('reffered');
      const status = isReferredVariant ? 'Referred' : rawStatus;
      const key = status.toLowerCase();
      const existing = merged.get(key);
      const count = Number(item.count) || 0;
      if (existing) {
        existing.count += count;
      } else {
        merged.set(key, { status, count });
      }
    });
    return Array.from(merged.values());
  }

  private mergeLocationCounts(
    first: LocationCount[],
    second: LocationCount[],
  ): LocationCount[] {
    const merged = new Map<string, LocationCount>();
    [...first, ...second].forEach((item) => {
      const label =
        item.county || item.state || item.payam || item.boma || 'Unknown';
      const key = label.toLowerCase();
      const existing = merged.get(key);
      if (existing) {
        existing.count = (existing.count || 0) + (item.count || 0);
      } else {
        merged.set(key, { ...item, count: item.count || 0 });
      }
    });
    return Array.from(merged.values());
  }

  private mergeResolutionTimes(
    first: ResolutionTime[],
    second: ResolutionTime[],
  ): ResolutionTime[] {
    const merged = new Map<
      string,
      { item: ResolutionTime; total: number; parts: number }
    >();

    [...first, ...second]
      .filter((i) => i.averageResolutionTime > 0)
      .forEach((item) => {
        const label =
          item.county || item.state || item.payam || item.boma || 'Unknown';
        const key = label.toLowerCase();
        const existing = merged.get(key);
        if (existing) {
          existing.total += item.averageResolutionTime;
          existing.parts += 1;
          existing.item.averageResolutionTime = existing.total / existing.parts;
        } else {
          merged.set(key, {
            item: { ...item },
            total: item.averageResolutionTime,
            parts: 1,
          });
        }
      });

    return Array.from(merged.values()).map((entry) => entry.item);
  }

  private createStatusChart(items: StatusCount[]): any {
    const colors = items.map((item) => {
      const status = (item.status || '').toLowerCase().trim();

      const isUnresolved =
        status.includes('pending') ||
        status.includes('in progress') ||
        status.includes('open') ||
        status.includes('new') ||
        status.includes('unresolved');

      const isResolved =
        status.includes('resolved') ||
        status.includes('closed') ||
        status.includes('completed');

      if (isUnresolved) return '#f06292';
      if (isResolved) return '#00b579';
      return '#0dcaf0';
    });

    return {
      labels: items.map((i) => i.status || 'Unknown'),
      datasets: [
        {
          data: items.map((i) => i.count),
          backgroundColor: colors,
          hoverBackgroundColor: colors.map((c) => c + 'dd'),
          borderWidth: 0,
          borderRadius: 4,
        },
      ],
    };
  }

  private createTypeChart(items: TypeCount[]): any {
    const colors = this.buildPalette(items.length);
    return {
      labels: items.map(
        (i) => i.type || i.referralService || i.title || 'Unknown',
      ),
      datasets: [
        {
          data: items.map((i) => i.count),
          backgroundColor: colors,
          hoverBackgroundColor: colors.map((c) => c + 'dd'),
          borderWidth: 0,
        },
      ],
    };
  }

  private createLocationChart(items: LocationCount[]): any {
    const sorted = [...items].sort((a, b) => b.count - a.count).slice(0, 10);
    const locationPalette = [
      '#4b9fe3',
      '#57b86a',
      '#ff7043',
      '#7c83fd',
      '#26c6da',
      '#ffb74d',
      '#ec407a',
      '#66bb6a',
      '#42a5f5',
      '#ab47bc',
    ];
    return {
      labels: sorted.map(
        (i) => i.county || i.state || i.payam || i.boma || 'Unknown',
      ),
      datasets: [
        {
          label: 'Total Cases',
          data: sorted.map((i) => i.count),
          backgroundColor: sorted.map(
            (_, idx) => locationPalette[idx % locationPalette.length],
          ),
          hoverBackgroundColor: sorted.map(
            (_, idx) => locationPalette[idx % locationPalette.length] + 'dd',
          ),
          borderRadius: { topLeft: 6, topRight: 6 },
          borderSkipped: false,
          barThickness: 24,
          maxBarThickness: 28,
          categoryPercentage: 0.74,
          barPercentage: 0.88,
        },
      ],
    };
  }

private createResolutionTimeChart(items: ResolutionTime[]): any {
  const sorted = [...items]
    .filter((i) => i.averageResolutionTime > 0)
    .sort((a, b) => b.averageResolutionTime - a.averageResolutionTime)
    .slice(0, 8);

  const colors = ['#20c997', '#20c997'];

  return {
    labels: sorted.map(
      (i) => i.county || i.state || i.payam || i.boma || 'Unknown'
    ),
    datasets: [
      {
        label: 'Avg Days',
        data: sorted.map(
          (i) => Math.round(i.averageResolutionTime * 10) / 10
        ),
        backgroundColor: sorted.map((_, index) => colors[index % 2]),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };
}

  private buildPalette(length: number): string[] {
    const base = this.extendedPalette.length
      ? this.extendedPalette
      : this.brandPalette;
    return Array.from({ length }, (_, index) => base[index % base.length]);
  }

  hasChartData(chartData: any): boolean {
    if (!chartData || !Array.isArray(chartData.datasets)) return false;
    return chartData.datasets.some((dataset: any) =>
      Array.isArray(dataset?.data) &&
      dataset.data.some((value: any) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) && numeric > 0;
      }),
    );
  }

  formatResolutionTime(days: number): string {
    if (!days) return 'N/A';
    return days.toFixed(1) + ' days';
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }
}
