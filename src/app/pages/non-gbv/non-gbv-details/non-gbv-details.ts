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
import { ProgressBarModule } from 'primeng/progressbar';
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
    ProgressBarModule,
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
  isAttachmentDownloading = false;
  downloadProgress: Map<string, number> = new Map();
  currentDownloadProgress: number = 0;
  displayDownloadDialog = false;
  downloadDialogMessage = '';

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

  grievanceStatusLabel = '';
  grievanceStatusBadgeClass = '';

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
    const statusParam = this.route.snapshot.queryParamMap.get('status');
    if (statusParam) {
      this.grievanceStatusLabel = this.getStatusLabel(statusParam);
      this.grievanceStatusBadgeClass = this.getStatusBadgeClass(statusParam);
    }

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

  getSelectionCriteriaName(value: number): string {
    const criteriaMap: Record<number, string> = { 0: 'LIPW', 1: 'DIS' };
    return criteriaMap[value] ?? '--';
  }

  getStatusLabel(status: string | number): string {
    const s = String(status).toLowerCase();
    if (s === '5' || s === 'resolved') return 'Resolved';
    if (s === '15' || s === 'referred') return 'Referred';
    return 'Unresolved';
  }

  getStatusBadgeClass(status: string | number): string {
    const s = String(status).toLowerCase();
    if (s === '5' || s === 'resolved') return 'bg-success';
    if (s === '15' || s === 'referred') return 'bg-danger';
    return 'bg-warning';
  }

  formatDisplayDate(value: string | null | undefined): string {
    if (!value) return '';

    const ddMmYyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = value.match(ddMmYyyy);

    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]) - 1;
      const year = Number(match[3]);
      const date = new Date(year, month, day);
      return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('en-GB').format(date);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('en-GB').format(date);
  }

  getAttachmentDisplayName(): string {
    const filePath = this.grievanceDetails?.grievanceAttachmentFilename;
    if (!filePath) return 'Download Attachment';
    const parts = filePath.split(/[\\/]/);
    return parts[parts.length - 1] || 'Download Attachment';
  }

async downloadAttachment(): Promise<void> {
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
    this.isAttachmentDownloading = true;
    this.displayDownloadDialog = true;
    this.downloadDialogMessage = 'Downloading attachment...';
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
              this.currentDownloadProgress = percent;
            } else {
              this.downloadProgress.set(key, -1);
              this.currentDownloadProgress = -1;
            }
            this.cdr.detectChanges();
          },
        }
      );

      this.downloadProgress.set(key, 100);
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
      this.isAttachmentDownloading = false;
      this.currentDownloadProgress = 0;
      this.displayDownloadDialog = false;
      this.downloadDialogMessage = '';
      this.cdr.detectChanges();
    }
  }
}
}
