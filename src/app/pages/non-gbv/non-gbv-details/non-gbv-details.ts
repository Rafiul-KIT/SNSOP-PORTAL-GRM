import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { LookupItem, LookupService } from '../../../services/lookup.service';
import { MessageService, MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { CardModule } from 'primeng/card';
import { Loader } from '../../../components/loader/loader';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

interface ValueLabelItem {
  label: string;
  value: any;
}

interface NonGbvGrievanceDetails {
  id: number;
  trackingNumber: string;
  stateId: number;
  countyId: number;
  payamId: number;
  bomaId: number;
  incidentOccurredAt: string;
  reportingChannelId: number;
  reportingChannelOther: string;
  complainantName: string;
  complainantContact: string;
  complainantPhysicalAddress: string;
  complainantGender: number;
  complainantAge: number;
  complainantBeneficiary: boolean;
  complainantBeneficiarySelectionCriteria: number;
  grievanceTypeId: number;
  grievanceDetailTypeId: number;
  grievanceTypeOtherDesc: string;
  grievanceDescription: string;
  grievanceAttachmentUrl: string;
  grievanceAttachmentFile: string;
  grievanceAttachmentBytes: string;
  grievanceAttachmentFilename: string;
  status: string; // Assuming status is returned as a string or number
}

@Component({
  selector: 'app-non-gbv-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BreadcrumbModule,
    CardModule,
    Loader,
    ButtonModule,
    DialogModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './non-gbv-details.html',
  styleUrl: './non-gbv-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonGbvDetails implements OnInit {
  grievanceId: number | null = null;
  grievanceDetails: NonGbvGrievanceDetails | null = null;
  isLoading = true;

  breadcrumbItems: MenuItem[] = [];
  breadcrumbHome: MenuItem = { icon: 'fas fa-home', routerLink: '/dashboard' };

  // Lookup data for displaying names instead of IDs
  states: LookupItem[] = [];
  counties: LookupItem[] = [];
  payams: LookupItem[] = [];
  bomas: LookupItem[] = [];
  genders: ValueLabelItem[] = [];
  reportingChannels: ValueLabelItem[] = [];
  grievanceCategories: ValueLabelItem[] = []; // Categories (parent)
  grievanceTypes: ValueLabelItem[] = []; // Detailed types (child)

  // Status options (example, adjust as per actual statuses)
  statusOptions = [
    { label: 'Pending', value: 'Pending' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Resolved', value: 'Resolved' },
    { label: 'Rejected', value: 'Rejected' },
  ];

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private apiService: ApiService,
    private lookupService: LookupService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {}

  async ngOnInit() {
    this.initBreadcrumb();
    this.grievanceId = Number(this.route.snapshot.paramMap.get('id'));

    if (this.grievanceId) {
      await this.loadLookups(); // Load all necessary lookups first
      await this.fetchGrievanceDetails(this.grievanceId);
    } else {
      this.isLoading = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No grievance ID provided.',
      });
    }
    this.cdr.detectChanges(); // Ensure UI updates after loading
  }

  initBreadcrumb() {
    this.breadcrumbItems = [{ label: 'Non-GBV Grievances Details' }];
  }

  async loadLookups() {
    try {
      // Load all static lookups in parallel
      const [
        statesRes,
        categoriesRes,
        reportingChannelsRes,
        gendersList,
      ] = await Promise.all([
        this.lookupService.getOrFetchStateList(),
        this.apiService.GET('api/grievance/type'), // For categories
        this.apiService.GET('api/grievance/reporting-channel'), // For reporting channels
        this.lookupService.getGenderListbyId(), // For genders
      ]);

      this.states = statesRes;
      this.grievanceCategories = categoriesRes?.data?.content
        .filter((item: any) => item.status === true)
        .map((item: any) => ({ label: item.details, value: item.id }));
      this.reportingChannels = reportingChannelsRes?.data?.content
        .filter((item: any) => item.ngbvChannel === true)
        .map((item: any) => ({ label: item.detail, value: item.id }));
      this.genders = gendersList.map((item) => ({ label: item.name, value: parseInt(item.id) }));
    } catch (error) {
      console.error('Error loading initial lookups:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load lookup data.',
      });
    }
    this.cdr.markForCheck();
  }

  async fetchGrievanceDetails(id: number) {
    this.isLoading = true;
    try {
      const res: any = await this.apiService.GET(`api/ngbv-grievance/get?id=${id}`);
      if (res?.data?.content?.length) {
        this.grievanceDetails = res.data.content[0];
        // After loading details, load dependent lookups (county, payam, boma, grievance types)
        await this.loadDependentLookups(this.grievanceDetails!);
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Not Found',
          detail: 'Grievance details not found.',
        });
      }
    } catch (error) {
      console.error('Error fetching grievance details:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to fetch grievance details.',
      });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadDependentLookups(details: NonGbvGrievanceDetails) {
    if (details.stateId) {
      this.counties = await this.lookupService.getCountyListByStateId(String(details.stateId));
    }
    if (details.countyId) {
      this.payams = await this.lookupService.getPayamListByCountyId(String(details.countyId));
    }
    if (details.payamId) {
      this.bomas = await this.lookupService.getBomaListByPayamId(String(details.payamId));
    }
    if (details.grievanceTypeId) {
      const res: any = await this.apiService.GET(`api/grievance/detail-type`, { type: details.grievanceTypeId });
      if (res?.data?.content) {
        this.grievanceTypes = res.data.content
          .filter((item: any) => item.status === true)
          .map((item: any) => ({ label: item.details, value: item.id }));
      }
    }
    this.cdr.markForCheck();
  }

  // Helper functions to get names from IDs
  getStateName(id: number | string): string {
    const item = this.states.find((s) => s.id === String(id));
    return item ? item.name : String(id);
  }

  getCountyName(id: number | string): string {
    const item = this.counties.find((c) => c.id === String(id));
    return item ? item.name : String(id);
  }

  getPayamName(id: number | string): string {
    const item = this.payams.find((p) => p.id === String(id));
    return item ? item.name : String(id);
  }

  getBomaName(id: number | string): string {
    const item = this.bomas.find((b) => b.id === String(id));
    return item ? item.name : String(id);
  }

  getGenderName(id: number | string): string {
    const item = this.genders.find((g) => g.value === id); // Assuming gender value is numeric
    return item ? item.label : String(id);
  }

  getReportingChannelName(id: number | string): string {
    const item = this.reportingChannels.find((rc) => rc.value === id);
    return item ? item.label : String(id);
  }

  getGrievanceCategoryName(id: number | string): string {
    const item = this.grievanceCategories.find((gc) => gc.value === id);
    return item ? item.label : String(id);
  }

  getGrievanceTypeName(id: number | string): string {
    const item = this.grievanceTypes.find((gt) => gt.value === id);
    return item ? item.label : String(id);
  }

  getBeneficiaryStatus(isBeneficiary: boolean): string {
    return isBeneficiary ? 'Yes' : 'No';
  }

  getStatusLabel(statusValue: string | number): string {
    const status = this.statusOptions.find(s => s.value === statusValue);
    return status ? status.label : String(statusValue);
  }

  // Helper to handle attachment download
  downloadAttachment(url: string, filename: string): void {
    // Implement download logic here, e.g., using window.open or a more robust approach
    window.open(url, '_blank');
  }
}
