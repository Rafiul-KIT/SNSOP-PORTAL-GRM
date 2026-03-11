import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
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

interface GbvGrievanceDetails {
  id: number;
  trackingNumber: string;
  stateId: number;
  countyId: number;
  payamId: number;
  bomaId: number;
  incidentOccurredAt: string;
  contactFocalPersonName: string;
  incidentReportedBy: number;
  incidentReportedByOtherDesc: string;
  reportingChannelId: number;
  reportingChannelOther: string;
  complainantContactNumber: string;
  complainantGender: number;
  ageOfSurvivor: number;
  complainantBeneficiary: boolean;
  complainantBeneficiarySelectionCriteria: number;
  suspectKnown: boolean;
  suspectAssociatedWithProject: boolean;
  suspectDetails: string;
  recommendedReferralServiceId: number;
  grievanceDescription: string;
  grievanceAttachmentUrl: string;
  grievanceAttachmentFile: string;
  grievanceAttachmentBytes: string;
  grievanceAttachmentFilename: string;
  verbalConsentGranted: boolean;
  consentSigned: boolean;
  consentFormAttachmentUrl: string;
  consentFormAttachmentFile: string;
  consentFormAttachmentBytes: string;
  consentFormAttachmentFilename: string;
}

@Component({
  selector: 'app-gbv-details',
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
  templateUrl: './gbv-details.html',
  styleUrl: './gbv-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GbvDetails implements OnInit {
  private apiService = inject(ApiService);
  private lookupService = inject(LookupService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);
  public router = inject(Router);

  grievanceId: number | null = null;
  grievanceDetails: GbvGrievanceDetails | null = null;
  isLoading = true;

  breadcrumbItems: MenuItem[] = [];
  breadcrumbHome: MenuItem = { icon: 'fas fa-home', routerLink: '/dashboard' };

  states: LookupItem[] = [];
  counties: LookupItem[] = [];
  payams: LookupItem[] = [];
  bomas: LookupItem[] = [];
  genders: ValueLabelItem[] = [];
  reportingChannels: ValueLabelItem[] = [];

  incidentReporters = [
    { label: 'Survivor', value: 1 },
    { label: 'Family Member', value: 2 },
    { label: 'Other', value: 3 },
  ];

  constructor() {}

  async ngOnInit() {
    this.initBreadcrumb();
    this.grievanceId = Number(this.route.snapshot.paramMap.get('id'));

    if (this.grievanceId) {
      await this.loadLookups();
      await this.fetchGrievanceDetails(this.grievanceId);
    } else {
      this.isLoading = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No grievance ID provided.',
      });
    }
    this.cdr.detectChanges();
  }

  initBreadcrumb() {
    this.breadcrumbItems = [{ label: 'GBV Grievances Details' }];
  }

  async loadLookups() {
    try {
      const [
        statesRes,
        reportingChannelsRes,
        gendersList,
      ] = await Promise.all([
        this.lookupService.getOrFetchStateList(),
        this.apiService.GET('api/grievance/reporting-channel'),
        this.lookupService.getGenderListbyId(),
      ]);

      this.states = statesRes;
      this.reportingChannels = reportingChannelsRes?.data?.content
        .map((item: any) => ({ label: item.detail, value: item.id }));
      this.genders = gendersList.map((item) => ({ label: item.name, value: parseInt(item.id) }));
    } catch (error) {
      console.error('Error loading lookups:', error);
    }
    this.cdr.markForCheck();
  }

  async fetchGrievanceDetails(id: number) {
    this.isLoading = true;
    try {
      const res: any = await this.apiService.GET(`api/gbv-grievance/get`, { id });
      if (res?.data?.content?.length) {
        this.grievanceDetails = res.data.content[0];
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
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadDependentLookups(details: GbvGrievanceDetails) {
    if (details.stateId) {
      this.counties = await this.lookupService.getCountyListByStateId(String(details.stateId));
    }
    if (details.countyId) {
      this.payams = await this.lookupService.getPayamListByCountyId(String(details.countyId));
    }
    if (details.payamId) {
      this.bomas = await this.lookupService.getBomaListByPayamId(String(details.payamId));
    }
    this.cdr.markForCheck();
  }

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
    const item = this.genders.find((g) => g.value === id);
    return item ? item.label : String(id);
  }

  getReportingChannelName(id: number | string): string {
    const item = this.reportingChannels.find((rc) => rc.value === id);
    return item ? item.label : String(id);
  }

  getIncidentReportedByName(id: number): string {
    const item = this.incidentReporters.find((ir) => ir.value === id);
    return item ? item.label : String(id);
  }

  getSelectionCriteriaName(value: any): string {
    return this.lookupService.getSelectionCriteriaEnumByValue(value);
  }

  getBeneficiaryStatus(isBeneficiary: boolean): string {
    return isBeneficiary ? 'Yes' : 'No';
  }

  getYesNoLabel(value: boolean | null | undefined): string {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return '--';
  }

  formatDisplayDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('en-GB').format(date);
  }
}
