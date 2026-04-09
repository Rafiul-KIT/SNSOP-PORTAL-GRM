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
  stateId: number;
  countyId: number;
  payamId: number;
  bomaId: number;
  gbvCount: number;
  ngbvCount: number;
  totalCount: number;
  gbvPercentage: number;
  ngbvPercentage: number;
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
  hasInitialLoadCompleted = false;
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
    this.onSearch();
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

  async onSearch() {
    if (this.hasInitialLoadCompleted) {
      this.isTableLoading = true;
    } else {
      this.isLoading = true;
    }
    this.cdr.markForCheck();

    try {
      const raw = this.filterForm.getRawValue();
      const params: Record<string, any> = {};
      if (raw.state?.id) params['stateId'] = raw.state.id;
      if (raw.county?.id) params['countyId'] = raw.county.id;
      if (raw.payam?.id) params['payamId'] = raw.payam.id;
      if (raw.boma?.id) params['bomaId'] = raw.boma.id;

      const res = await this.api.GET<AnalyticalRow[]>('api/grievance/analytical-report', params);
      this.reportData = res.data ?? [];
      this.calculateTotals();
      this.hasInitialLoadCompleted = true;
    } catch (err) {
      console.error('Analytical report fetch error:', err);
      this.reportData = [];
    } finally {
      this.isLoading = false;
      this.isTableLoading = false;
      this.cdr.detectChanges();
    }
  }

  calculateTotals() {
    this.totalGbv = this.reportData.reduce((sum, r) => sum + r.gbvCount, 0);
    this.totalNonGbv = this.reportData.reduce((sum, r) => sum + r.ngbvCount, 0);
    this.totalComplaint = this.reportData.reduce((sum, r) => sum + r.totalCount, 0);
  }

  getGeoLabel(row: AnalyticalRow): string {
    const state = this.states.find(s => +s.id === row.stateId)?.name ?? '';
    const county = this.counties.find(c => +c.id === row.countyId)?.name ?? '';
    const payam = this.payams.find(p => +p.id === row.payamId)?.name ?? '';
    const boma = this.bomas.find(b => +b.id === row.bomaId)?.name ?? '';
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
    this.reportData = [];
    this.totalGbv = 0;
    this.totalNonGbv = 0;
    this.totalComplaint = 0;
    this.cdr.markForCheck();
  }
}
