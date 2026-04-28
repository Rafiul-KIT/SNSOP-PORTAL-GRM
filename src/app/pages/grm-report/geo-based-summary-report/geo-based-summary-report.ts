import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { MenuItem } from 'primeng/api';
import { LookupItem, LookupService } from '../../../services/lookup.service';
import { ApiService } from '../../../services/api.service';
import { Loader } from '../../../components/loader/loader';

interface GeoSummaryRow {
  grievanceCategory: string;
  stateId: number;
  stateName: string;
  countyId: number;
  countyName: string;
  payamId: number;
  payamName: string;
  bomaId: number;
  bomaName: string;
  totalCount: number;
  totalResolved: number;
  totalInProgress: number;
  totalUnresolved: number;
}

interface PaginatedApiResponse<T> {
  code: number;
  message: string;
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
}

type ReportFormat = 'PDF' | 'EXCEL';

@Component({
  selector: 'app-geo-based-summary-report',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    PaginatorModule,
    ProgressBarModule,
    DialogModule,
    BreadcrumbModule,
    FloatLabelModule,
    SelectModule,
    Loader,
  ],
  templateUrl: './geo-based-summary-report.html',
  styleUrl: './geo-based-summary-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeoBasedSummaryReport implements OnInit {
  isLoading = true;
  isTableLoading = false;
  isDownloading = false;
  downloadingFormat: ReportFormat | null = null;
  downloadProgress = 0;
  hasInitialLoadCompleted = false;
  filterForm!: FormGroup;
  page = 0;
  size = 10;
  totalElements = 0;

  // Geo lookups
  states: LookupItem[] = [];
  counties: LookupItem[] = [];
  payams: LookupItem[] = [];
  bomas: LookupItem[] = [];

  // Report data
  reportData: GeoSummaryRow[] = [];

  // Breadcrumb
  breadcrumbItems: MenuItem[] = [
    { label: 'GRM Report' },
    { label: 'Geo-Based Summary Report' },
  ];
  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/dashboard' };

  // Filter options
  statusOptions = [
    { label: 'New', value: 'New' },
    { label: 'Unresolved', value: 'Unresolved' },
    { label: 'Resolved', value: 'Resolved' },
    { label: 'Referred', value: 'Referred' },
  ];

  categoryOptions = [
    { label: 'GBV', value: 'GBV' },
    { label: 'Non-GBV', value: 'NGBV' },
  ];

  genderOptions = [
    { label: 'Male', value: 0 },
    { label: 'Female', value: 1 },
  ];

  // Totals
  totalGrievanceLodged = 0;
  totalResolved = 0;
  totalInProgress = 0;
  totalUnresolved = 0;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private lookup: LookupService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.initForm();
    await this.loadInitialLookups();
    this.onSearch(true);
  }

  initForm() {
    this.filterForm = this.fb.group({
      state: [null],
      county: [{ value: null, disabled: true }],
      payam: [{ value: null, disabled: true }],
      boma: [{ value: null, disabled: true }],
      status: [null],
      category: [null],
      complainantGender: [null],
    });
  }

  async loadInitialLookups() {
    try {
      await this.lookup.getOrFetchStateList();
      this.states = this.lookup.getStateList();
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Lookups loading error:', err);
    }
  }

  // Dependent dropdowns
  async onStateChange(state: LookupItem | null) {
    this.filterForm.get('county')?.reset({ value: null, disabled: true });
    this.filterForm.get('payam')?.reset({ value: null, disabled: true });
    this.filterForm.get('boma')?.reset({ value: null, disabled: true });
    this.counties = [];
    this.payams = [];
    this.bomas = [];

    if (state?.id) {
      this.counties = await this.lookup.getCountyListByStateId(state.id);
      this.filterForm.get('county')?.enable();
    }
    this.cdr.markForCheck();
  }

  async onCountyChange(county: LookupItem | null) {
    this.filterForm.get('payam')?.reset({ value: null, disabled: true });
    this.filterForm.get('boma')?.reset({ value: null, disabled: true });
    this.payams = [];
    this.bomas = [];

    if (county?.id) {
      this.payams = await this.lookup.getPayamListByCountyId(county.id);
      this.filterForm.get('payam')?.enable();
    }
    this.cdr.markForCheck();
  }

  async onPayamChange(payam: LookupItem | null) {
    this.filterForm.get('boma')?.reset({ value: null, disabled: true });
    this.bomas = [];

    if (payam?.id) {
      this.bomas = await this.lookup.getBomaListByPayamId(payam.id);
      this.filterForm.get('boma')?.enable();
    }
    this.cdr.markForCheck();
  }

  async onSearch(resetPage: boolean = false) {
    if (resetPage) {
      this.page = 0;
    }

    if (this.hasInitialLoadCompleted) {
      this.isTableLoading = true;
    } else {
      this.isLoading = true;
    }
    this.cdr.markForCheck();

    try {
      const res = await this.api.GET<PaginatedApiResponse<GeoSummaryRow>>(
        'api/grievance/summary-report',
        this.buildFilters(true)
      );
      this.reportData = res.data?.content ?? [];
      this.page = res.data?.pageNumber ?? this.page;
      this.size = res.data?.pageSize ?? this.size;
      this.totalElements = res.data?.totalElements ?? this.reportData.length;
      this.calculateTotals();
      this.hasInitialLoadCompleted = true;
    } catch (err) {
      console.error('Geo summary report fetch error:', err);
      this.reportData = [];
      this.totalElements = 0;
    } finally {
      this.isLoading = false;
      this.isTableLoading = false;
      this.cdr.detectChanges();
    }
  }

  async downloadReport(reportFormat: ReportFormat = 'PDF') {
    this.isDownloading = true;
    this.downloadingFormat = reportFormat;
    this.downloadProgress = 0;
    this.cdr.markForCheck();

    try {
      const res = await this.api.POST<Blob>(
        'api/grievance/summary-report/download',
        { ...this.buildFilters(false), reportFormat },
        'global',
        {
          responseType: 'blob',
          onDownloadProgress: (event) => {
            if (event.total) {
              this.downloadProgress = Math.round((event.loaded * 100) / event.total);
            } else if (event.loaded > 0) {
              this.downloadProgress = Math.min(95, this.downloadProgress + 5);
            }
            this.cdr.markForCheck();
          },
        }
      );
      const ext = reportFormat === 'PDF' ? 'pdf' : 'xlsx';
      const filename = this.extractFilename(res.headers?.['content-disposition']) ?? `summary-report.${ext}`;
      this.downloadProgress = 100;
      this.saveBlob(res.data, filename);
    } catch (err) {
      console.error('Geo summary report download error:', err);
    } finally {
      this.isDownloading = false;
      this.downloadingFormat = null;
      this.cdr.markForCheck();
    }
  }

  calculateTotals() {
    this.totalGrievanceLodged = this.reportData.reduce((sum, r) => sum + r.totalCount, 0);
    this.totalResolved = this.reportData.reduce((sum, r) => sum + r.totalResolved, 0);
    this.totalInProgress = this.reportData.reduce((sum, r) => sum + r.totalInProgress, 0);
    this.totalUnresolved = this.reportData.reduce((sum, r) => sum + r.totalUnresolved, 0);
  }

  getGeoLabel(row: GeoSummaryRow): string {
    const state = row.stateName || this.states.find(s => +s.id === row.stateId)?.name || '';
    const county = row.countyName || this.counties.find(c => +c.id === row.countyId)?.name || '';
    const payam = row.payamName || this.payams.find(p => +p.id === row.payamId)?.name || '';
    const boma = row.bomaName || this.bomas.find(b => +b.id === row.bomaId)?.name || '';
    return [state, county, payam, boma].filter(Boolean).join(' - ');
  }

  resetForm() {
    this.filterForm.reset();
    this.filterForm.get('county')?.disable();
    this.filterForm.get('payam')?.disable();
    this.filterForm.get('boma')?.disable();
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.page = 0;
    this.onSearch(true);
  }

  onPageChange(event: any) {
    this.page = event.page;
    this.size = event.rows;
    this.onSearch(false);
  }

  private buildFilters(withPagination: boolean): Record<string, any> {
    const raw = this.filterForm.getRawValue();
    const filters: Record<string, any> = {};

    if (raw.category) filters['grievanceType'] = raw.category;
    if (raw.state?.id) filters['stateId'] = raw.state.id;
    if (raw.county?.id) filters['countyId'] = raw.county.id;
    if (raw.payam?.id) filters['payamId'] = raw.payam.id;
    if (raw.boma?.id) filters['bomaId'] = raw.boma.id;
    if (raw.complainantGender !== null && raw.complainantGender !== undefined) {
      filters['complainantGender'] = raw.complainantGender;
    }

    if (withPagination) {
      filters['page'] = this.page;
      filters['size'] = this.size;
    }
    return filters;
  }

  private extractFilename(contentDisposition?: string): string | null {
    if (!contentDisposition) return null;
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] ?? null;
  }

  private saveBlob(data: Blob, filename: string) {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
}
