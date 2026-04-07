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
import { ProgressBarModule } from 'primeng/progressbar';
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
    ProgressBarModule,
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
  grievanceStatusLabel = '';
  grievanceStatusBadgeClass = '';

  isGrievanceAttachmentDownloading = false;
  isConsentFormAttachmentDownloading = false;
  downloadProgress: Map<string, number> = new Map();
  currentGrievanceDownloadProgress = 0;
  currentConsentDownloadProgress = 0;
  displayGrievanceDownloadDialog = false;
  displayConsentDownloadDialog = false;
  grievanceDownloadMessage = '';
  consentDownloadMessage = '';

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
    const statusParam = this.route.snapshot.queryParamMap.get('status');
    if (statusParam) {
      this.grievanceStatusLabel = this.getStatusLabel(statusParam);
      this.grievanceStatusBadgeClass = this.getStatusBadgeClass(statusParam);
    }

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

  getStatusLabel(status: string | number): string {
    const s = String(status).toLowerCase();
    if (s === '5' || s === 'resolved') return 'Resolved';
    if (s === '15' || s === 'referred') return 'Referred';
    return 'Unresolved';
  }

  getStatusBadgeClass(status: string | number): string {
    const label = this.getStatusLabel(status);
    if (label === 'Resolved') return 'bg-success';
    if (label === 'Referred') return 'bg-danger';
    return 'bg-warning';
  }

  formatDisplayDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('en-GB').format(date);
  }

  async downloadGrievanceAttachment(): Promise<void> {
    const attachmentUrl = this.grievanceDetails?.grievanceAttachmentUrl;
    if (attachmentUrl && (attachmentUrl.startsWith('https://') )) {
      window.open(attachmentUrl, '_blank');
    } else {
      if (!attachmentUrl) {
        this.messageService.add({
          severity: 'warn',
          summary: 'No Attachment',
          detail: 'No valid attachment found for this grievance.',
        });
        return;
      }
      const bucketName = 'grievance-files';
      const urlWithoutQuery = attachmentUrl.split('?')[0];
      const filePath = decodeURIComponent(
        urlWithoutQuery.substring(urlWithoutQuery.indexOf(bucketName) + bucketName.length + 1)
      );

      if (!filePath) {
        this.messageService.add({
          severity: 'warn',
          summary: 'No Attachment',
          detail: 'Could not resolve attachment path.',
        });
        return;
      }

      const key = filePath;
      this.downloadProgress.set(key, 0);
      this.isGrievanceAttachmentDownloading = true;
      this.displayGrievanceDownloadDialog = true;
      this.grievanceDownloadMessage = 'Downloading grievance attachment...';
      this.cdr.detectChanges();

      try {
        const response: any = await this.apiService.GET(
          '/api/grievance/attachment/get',
          { filePath },
          'global',
          {
            responseType: 'blob',
            onDownloadProgress: (progressEvent: any) => {
              if (progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                this.downloadProgress.set(key, percent);
                this.currentGrievanceDownloadProgress = percent;
              } else {
                this.downloadProgress.set(key, -1);
                this.currentGrievanceDownloadProgress = -1;
              }
              this.cdr.detectChanges();
            },
          }
        );

        this.downloadProgress.set(key, 100);
        this.currentGrievanceDownloadProgress = 100;
        this.cdr.detectChanges();

        const blob = new Blob([response.data], { type: response.headers.get('Content-Type') });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.grievanceDetails?.grievanceAttachmentFilename || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to download attachment:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Download Failed',
          detail: 'Could not download the attachment. Please try again.',
        });
      } finally {
        this.downloadProgress.delete(key);
        this.isGrievanceAttachmentDownloading = false;
        this.currentGrievanceDownloadProgress = 0;
        this.displayGrievanceDownloadDialog = false;
        this.cdr.detectChanges();
      }
    }
  }

  async downloadConsentFormAttachment(): Promise<void> {
    const attachmentUrl = this.grievanceDetails?.consentFormAttachmentUrl;
    if (attachmentUrl && (attachmentUrl.startsWith('https://') )) {
      window.open(attachmentUrl, '_blank');
    } else {
      if (!attachmentUrl) {
        this.messageService.add({
          severity: 'warn',
          summary: 'No Attachment',
          detail: 'No valid attachment found for this grievance.',
        });
        return;
      }
      const bucketName = 'grievance-files';
      const urlWithoutQuery = attachmentUrl.split('?')[0];
      const filePath = decodeURIComponent(
        urlWithoutQuery.substring(urlWithoutQuery.indexOf(bucketName) + bucketName.length + 1)
      );

      if (!filePath) {
        this.messageService.add({
          severity: 'warn',
          summary: 'No Attachment',
          detail: 'Could not resolve attachment path.',
        });
        return;
      }

      const key = filePath;
      this.downloadProgress.set(key, 0);
      this.isConsentFormAttachmentDownloading = true;
      this.displayConsentDownloadDialog = true;
      this.consentDownloadMessage = 'Downloading consent form...';
      this.cdr.detectChanges();

      try {
        const response: any = await this.apiService.GET(
          '/api/grievance/attachment/get',
          { filePath },
          'global',
          {
            responseType: 'blob',
            onDownloadProgress: (progressEvent: any) => {
              if (progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                this.downloadProgress.set(key, percent);
                this.currentConsentDownloadProgress = percent;
              } else {
                this.downloadProgress.set(key, -1);
                this.currentConsentDownloadProgress = -1;
              }
              this.cdr.detectChanges();
            },
          }
        );

        this.downloadProgress.set(key, 100);
        this.currentConsentDownloadProgress = 100;
        this.cdr.detectChanges();

        const blob = new Blob([response.data], { type: response.headers.get('Content-Type') });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.grievanceDetails?.consentFormAttachmentFilename || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to download attachment:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Download Failed',
          detail: 'Could not download the attachment. Please try again.',
        });
      } finally {
        this.downloadProgress.delete(key);
        this.isConsentFormAttachmentDownloading = false;
        this.currentConsentDownloadProgress = 0;
        this.displayConsentDownloadDialog = false;
        this.cdr.detectChanges();
      }
    }
  }
}
