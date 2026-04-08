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
  title?: string;
  count: number;
}

interface CountyCount {
  county: string;
  count: number;
}

interface ResolutionTimeByCounty {
  county: string;
  averageResolutionTime: number;
}

interface SectionSummary {
  totalGrievances: number;
  resolved: number;
  pending: number;
  resolvedPercentage: number;
}

interface AllGrievancesSection {
  summary: SectionSummary;
  grievancesByStatus: StatusCount[];
  grievancesByCounty: CountyCount[];
  avgResolutionTimeByCounty: ResolutionTimeByCounty[];
}

interface GbvSection {
  summary: SectionSummary;
  grievancesByStatus: StatusCount[];
  grievancesByCounty: CountyCount[];
  avgResolutionTimeByCounty: ResolutionTimeByCounty[];
  referralServices: TypeCount[];
  perpetratorInfo: TypeCount[];
}

interface NgbvSection {
  summary: SectionSummary;
  grievancesByStatus: StatusCount[];
  grievancesByCounty: CountyCount[];
  avgResolutionTimeByCounty: ResolutionTimeByCounty[];
  grievancesByType: TypeCount[];
}

interface ApiResponseV2 {
  allGrievances: AllGrievancesSection;
  gbvGrievances: GbvSection;
  ngbvGrievances: NgbvSection;
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
  dataLoaded = false;

  activeTab = '0';

  // NGBV Stats
  ngbvTotalCases = 0;
  ngbvPendingCases = 0;
  ngbvResolvedCases = 0;
  ngbvResolvedPercentage = 0;

  // GBV Stats
  gbvTotalCases = 0;
  gbvPendingCases = 0;
  gbvResolvedCases = 0;
  gbvResolvedPercentage = 0;

  // Combined Stats
  allTotalCases = 0;
  allPendingCases = 0;
  allResolvedCases = 0;
  allResolvedPercentage = 0;

  // Chart data
  ngbvStatusChartData: any;
  ngbvTypeChartData: any;
  ngbvLocationChartData: any;
  ngbvResolutionChartData: any;

  gbvStatusChartData: any;
  gbvLocationChartData: any;
  gbvResolutionChartData: any;
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
        grid: { display: false },
        ticks: { color: '#334155', font: { size: 11, weight: '500' }, maxRotation: 45, minRotation: 0 },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.15)', drawBorder: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
    },
  };

  locationBarChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
        grid: { display: false },
        ticks: {
          color: '#334155',
          font: { size: 11, weight: '500' },
          maxRotation: 45,
          minRotation: 0,
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
      const response = await this.apiService.GET<ApiResponseV2>(
        '/api/grievance/dashboard/v2',
      );
      const data = response.data;
      if (data) {
        this.processAllData(data.allGrievances);
        this.processNGBVData(data.ngbvGrievances);
        this.processGBVData(data.gbvGrievances);
        this.dataLoaded = true;
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      this.error = 'Failed to load dashboard data. Please try again later.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private processAllData(section: AllGrievancesSection | undefined) {
    if (!section) return;

    this.allTotalCases = section.summary?.totalGrievances ?? 0;
    this.allResolvedCases = section.summary?.resolved ?? 0;
    this.allPendingCases = section.summary?.pending ?? 0;
    this.allResolvedPercentage = section.summary?.resolvedPercentage ?? 0;

    this.allStatusChartData = this.createStatusChart(section.grievancesByStatus ?? []);
    this.allLocationChartData = this.createCountyChart(section.grievancesByCounty ?? []);
    this.allResolutionChartData = this.createResolutionTimeChart(section.avgResolutionTimeByCounty ?? []);
  }

  private processNGBVData(section: NgbvSection | undefined) {
    if (!section) return;

    this.ngbvTotalCases = section.summary?.totalGrievances ?? 0;
    this.ngbvResolvedCases = section.summary?.resolved ?? 0;
    this.ngbvPendingCases = section.summary?.pending ?? 0;
    this.ngbvResolvedPercentage = section.summary?.resolvedPercentage ?? 0;

    this.ngbvStatusChartData = this.createStatusChart(section.grievancesByStatus ?? []);
    this.ngbvLocationChartData = this.createCountyChart(section.grievancesByCounty ?? []);
    this.ngbvResolutionChartData = this.createResolutionTimeChart(section.avgResolutionTimeByCounty ?? []);

    if (section.grievancesByType?.length) {
      this.ngbvTypeChartData = this.createTypeChart(section.grievancesByType);
    }
  }

  private processGBVData(section: GbvSection | undefined) {
    if (!section) return;

    this.gbvTotalCases = section.summary?.totalGrievances ?? 0;
    this.gbvResolvedCases = section.summary?.resolved ?? 0;
    this.gbvPendingCases = section.summary?.pending ?? 0;
    this.gbvResolvedPercentage = section.summary?.resolvedPercentage ?? 0;

    this.gbvStatusChartData = this.createStatusChart(section.grievancesByStatus ?? []);
    this.gbvLocationChartData = this.createCountyChart(section.grievancesByCounty ?? []);
    this.gbvResolutionChartData = this.createResolutionTimeChart(section.avgResolutionTimeByCounty ?? []);

    if (section.referralServices?.length) {
      this.gbvReferralServiceChartData = this.createTypeChart(section.referralServices);
    }

    if (section.perpetratorInfo?.length) {
      this.gbvPerpetratorChartData = this.createTypeChart(section.perpetratorInfo);
    }
  }

  private createStatusChart(items: StatusCount[]): any {
    const colors = items.map((item) => {
      const status = (item.status || '').toLowerCase().trim();

      const isUnresolved =
        status === 'pending' ||
        status === 'in progress' ||
        status === 'open' ||
        status === 'new' ||
        status === 'unresolved';

      const isResolved =
        status === 'resolved' ||
        status === 'closed' ||
        status === 'completed';

      const isReferred = status === 'referred';

      if (isUnresolved) return '#f06292';
      if (isResolved) return '#00b579';
      if (isReferred) return '#ffb74d';
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
      labels: items.map((i) => i.type || i.title || 'Unknown'),
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

  private createCountyChart(items: CountyCount[]): any {
    const sorted = [...items].sort((a, b) => b.count - a.count);
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
      labels: sorted.map((i) => i.county || 'Unknown'),
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
          borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: false,
          barThickness: 32,
          maxBarThickness: 40,
          categoryPercentage: 0.74,
          barPercentage: 0.88,
        },
      ],
    };
  }

  private createResolutionTimeChart(items: ResolutionTimeByCounty[]): any {
    const sorted = [...items]
      .filter((i) => i.averageResolutionTime > 0)
      .sort((a, b) => b.averageResolutionTime - a.averageResolutionTime);

    const colors = ['#20c997', '#20c997'];

    return {
      labels: sorted.map((i) => i.county || 'Unknown'),
      datasets: [
        {
          label: 'Avg Days',
          data: sorted.map(
            (i) => Math.round(i.averageResolutionTime * 10) / 10,
          ),
          backgroundColor: sorted.map((_, index) => colors[index % 2]),
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 32,
          maxBarThickness: 40,
        },
      ],
    };
  }

  private buildPalette(length: number): string[] {
    return Array.from({ length }, (_, index) => this.extendedPalette[index % this.extendedPalette.length]);
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

  getChartWidth(chartData: any, perItem = 60, minWidth = 400): string {
    if (!chartData?.labels?.length) return '100%';
    const width = Math.max(minWidth, chartData.labels.length * perItem);
    return width + 'px';
  }
}
