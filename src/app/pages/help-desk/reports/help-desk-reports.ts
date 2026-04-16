import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { Loader } from '../../../components/loader/loader';
import { ItSupportService, ITReportSummaryRow } from '../../../services/it-support.service';

@Component({
  selector: 'app-help-desk-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbModule, ButtonModule, TableModule, DatePickerModule, Loader],
  templateUrl: './help-desk-reports.html',
  styleUrls: ['./help-desk-reports.scss']
})
export class HelpDeskReports implements OnInit {
  breadcrumbHome = { icon: 'fas fa-home', routerLink: '/' };
  breadcrumbItems = [{ label: 'Help Desk' }, { label: 'Reports' }];

  isLoading = false;
  selectedMonthDate: Date = this.getCurrentMonthDate();
  maxMonthDate: Date = new Date();

  kpis = {
    totalCurrent: 0,
    totalPrevious: 0,
    avgTrend: 0,
    improvedReportTypes: 0
  };

  reportMatrix: ITReportSummaryRow[] = [];

  constructor(
    private itSupportService: ItSupportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReportSummary();
  }

  async loadReportSummary(): Promise<void> {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const rows = await this.itSupportService.getReportSummary(this.getApiMonthParam());
      this.reportMatrix = rows;
      this.calculateKpis(rows);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  onMonthChange(): void {
    this.loadReportSummary();
  }

  async exportSummaryPdf(): Promise<void> {
    const blob = await this.itSupportService.getReportSummaryPdf(this.getApiMonthParam());
    if (!blob) return;
    this.downloadBlob(blob, `help-desk-summary-${this.getApiMonthParam()}.pdf`);
  }

  async exportSummaryCsv(): Promise<void> {
    const blob = await this.itSupportService.getReportSummaryCsv(this.getApiMonthParam());
    if (!blob) return;
    this.downloadBlob(blob, `help-desk-summary-${this.getApiMonthParam()}.csv`);
  }

  private calculateKpis(rows: ITReportSummaryRow[]): void {
    const totalCurrent = rows.reduce((sum, row) => sum + (Number(row.currentMonth) || 0), 0);
    const totalPrevious = rows.reduce((sum, row) => sum + (Number(row.previousMonth) || 0), 0);
    const avgTrend = rows.length
      ? rows.reduce((sum, row) => sum + (Number(row.trend) || 0), 0) / rows.length
      : 0;
    const improvedReportTypes = rows.filter((row) => Number(row.trend) > 0).length;

    this.kpis = { totalCurrent, totalPrevious, avgTrend, improvedReportTypes };
  }

  private getCurrentMonthDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // API expects month in MMYYYY format, e.g. January 2024 => 012024.
  private getApiMonthParam(): string {
    if (!this.selectedMonthDate) return '';
    const month = String(this.selectedMonthDate.getMonth() + 1).padStart(2, '0');
    const year = String(this.selectedMonthDate.getFullYear());
    return `${month}${year}`;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  getTrendClass(trend: number): string {
    return Number(trend) >= 0 ? 'trend-positive' : 'trend-negative';
  }

  formatTrend(trend: number): string {
    const numericTrend = Number(trend) || 0;
    const sign = numericTrend > 0 ? '+' : '';
    return `${sign}${(numericTrend * 100).toFixed(1)}%`;
  }
}
