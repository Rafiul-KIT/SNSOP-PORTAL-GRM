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

interface GeoDetailRow {
  geoLocation: string;
  category: string;
  complainant: string;
  hhNo: string;
  complaint: string;
  resolved: number;
  inProgress: number;
  unresolved: number;
}

@Component({
  selector: 'app-geo-based-detail-report',
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
  templateUrl: './geo-based-detail-report.html',
  styleUrl: './geo-based-detail-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeoBasedDetailReport implements OnInit {
  isLoading = true;
  isTableLoading = false;
  filterForm!: FormGroup;

  // Geo lookups
  states: LookupItem[] = [];
  counties: LookupItem[] = [];
  payams: LookupItem[] = [];
  bomas: LookupItem[] = [];

  // Report data
  reportData: GeoDetailRow[] = [];

  // Breadcrumb
  breadcrumbItems: MenuItem[] = [
    { label: 'GRM Report' },
    { label: 'Geo-Based Detail Report' },
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
    // this.api.POST('api/report/geo-based-detail', body).then(...)

    this.reportData = [
      { geoLocation: 'Central Equatoria - Juba - Kator - Boma 1', category: 'GBV', complainant: 'John Doe', hhNo: '123', complaint: 'Complaint details here', resolved: 5, inProgress: 2, unresolved: 3 },
      { geoLocation: 'Central Equatoria - Juba - Kator - Boma 2', category: 'Non-GBV', complainant: 'Jane Smith', hhNo: '456', complaint: 'Complaint details here', resolved: 8, inProgress: 4, unresolved: 3 },
    ];
    this.calculateTotals();
    this.isTableLoading = false;
    this.cdr.markForCheck();
  }

  calculateTotals() {
    this.totalResolved = this.reportData.reduce((sum, r) => sum + r.resolved, 0);
    this.totalInProgress = this.reportData.reduce((sum, r) => sum + r.inProgress, 0);
    this.totalUnresolved = this.reportData.reduce((sum, r) => sum + r.unresolved, 0);
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
    this.totalResolved = 0;
    this.totalInProgress = 0;
    this.totalUnresolved = 0;
    this.cdr.markForCheck();
  }
}
