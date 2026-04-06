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
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { MenuItem } from 'primeng/api';
import { LookupItem, LookupService } from '../../../services/lookup.service';
import { ApiService } from '../../../services/api.service';
import { Loader } from '../../../components/loader/loader';

interface AnalyticalRow {
  geoLocation: string;
  gbv: number;
  nonGbv: number;
  totalComplaint: number;
  nonGbvPercentage: number;
  gbvPercentage: number;
  trendGbv: string;
  trendNonGbv: string;
}

@Component({
  selector: 'app-analytical-report',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    BreadcrumbModule,
    FloatLabelModule,
    SelectModule,
    Loader,
  ],
  templateUrl: './analytical-report.html',
  styleUrl: './analytical-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticalReport implements OnInit {
  isLoading = true;
  isTableLoading = false;
  filterForm!: FormGroup;

  // Geo lookups
  states: LookupItem[] = [];
  counties: LookupItem[] = [];
  payams: LookupItem[] = [];
  bomas: LookupItem[] = [];

  // Report data
  reportData: AnalyticalRow[] = [];

  // Breadcrumb
  breadcrumbItems: MenuItem[] = [
    { label: 'GRM Report' },
    { label: 'Analytical Report' },
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
    { label: 'Non-GBV', value: 'Non-GBV' },
  ];

  // Totals
  totalGbv = 0;
  totalNonGbv = 0;
  totalComplaint = 0;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private lookup: LookupService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.initForm();
    await this.loadInitialLookups();
    this.isLoading = false;
    this.cdr.markForCheck();
  }

  initForm() {
    this.filterForm = this.fb.group({
      state: [null],
      county: [{ value: null, disabled: true }],
      payam: [{ value: null, disabled: true }],
      boma: [{ value: null, disabled: true }],
      status: [null],
      category: [null],
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

  onSearch() {
    this.isTableLoading = true;
    this.cdr.markForCheck();

    // TODO: Replace with actual API call
    // const raw = this.filterForm.getRawValue();
    // this.api.POST('api/report/analytical', body).then(...)

    this.reportData = [
      { geoLocation: 'Central Equatoria - Juba - Kator - Boma 1', gbv: 30, nonGbv: 20, totalComplaint: 50, nonGbvPercentage: 40, gbvPercentage: 60, trendGbv: 'Increase 5%', trendNonGbv: 'Decrease 2%' },
      { geoLocation: 'Central Equatoria - Juba - Kator - Boma 2', gbv: 25, nonGbv: 15, totalComplaint: 40, nonGbvPercentage: 37.5, gbvPercentage: 62.5, trendGbv: 'Decrease 3%', trendNonGbv: 'Increase 2%' },
    ];
    this.calculateTotals();
    this.isTableLoading = false;
    this.cdr.markForCheck();
  }

  calculateTotals() {
    this.totalGbv = this.reportData.reduce((sum, r) => sum + r.gbv, 0);
    this.totalNonGbv = this.reportData.reduce((sum, r) => sum + r.nonGbv, 0);
    this.totalComplaint = this.reportData.reduce((sum, r) => sum + r.totalComplaint, 0);
  }

  getTrendClass(trend: string): string {
    const lower = trend.toLowerCase();
    if (lower.startsWith('increase')) return 'trend-increase';
    if (lower.startsWith('decrease')) return 'trend-decrease';
    return '';
  }

  getTrendIcon(trend: string): string {
    const lower = trend.toLowerCase();
    if (lower.startsWith('increase')) return 'pi pi-arrow-up';
    if (lower.startsWith('decrease')) return 'pi pi-arrow-down';
    return 'pi pi-minus';
  }

  resetForm() {
    this.filterForm.reset();
    this.filterForm.get('county')?.disable();
    this.filterForm.get('payam')?.disable();
    this.filterForm.get('boma')?.disable();
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.reportData = [];
    this.totalGbv = 0;
    this.totalNonGbv = 0;
    this.totalComplaint = 0;
    this.cdr.markForCheck();
  }
}
