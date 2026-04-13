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
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { LookupItem, LookupService } from '../../../services/lookup.service';
import { MessageService, MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { CardModule } from 'primeng/card';
import { Loader } from '../../../components/loader/loader';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import Swal from 'sweetalert2';

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

interface GbvProcessHistoryItem {
  id: number;
  gbvGrievanceId: number;
  followupActionFeedback: string;
  reportedToMgmtHr: boolean;
  reportedDetails: string;
  survivorSatisfied: boolean;
  survivorDetails: string;
  afterMgmtActionClosedAt: string;
  status: string;
}

@Component({
  selector: 'app-gbv-process-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    BreadcrumbModule,
    CardModule,
    Loader,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    SelectModule,
    CheckboxModule,
    DialogModule,
    TableModule,
    ProgressSpinnerModule,
    ProgressBarModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './gbv-process-details.html',
  styleUrl: './gbv-process-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GbvProcessDetails implements OnInit {
  today: Date = new Date();
  gbvGrievanceId: number | null = null;
  grievanceDetails: GbvGrievanceDetails | null = null;
  processForm!: FormGroup;
  isLoading = true;
  isSubmitting = false;
  grievanceStatusLabel = '';
  grievanceStatusBadgeClass = '';
  displayProcessDialog = false;

  isGrievanceAttachmentDownloading = false;
  isConsentFormAttachmentDownloading = false;
  downloadProgress: Map<string, number> = new Map();
  currentGrievanceDownloadProgress: number = 0;
  currentConsentDownloadProgress: number = 0;
  displayGrievanceDownloadDialog = false;
  displayConsentDownloadDialog = false;
  grievanceDownloadMessage = '';
  consentDownloadMessage = '';

  processHistory: GbvProcessHistoryItem[] = [];
  selectedHistoryDetail: GbvProcessHistoryItem | null = null;
  displayHistoryDetailDialog = false;
  isLoadingHistory = false;
  isLoadingHistoryDetail = false;
  currentProcessStatus: string | null = null;

  breadcrumbItems: MenuItem[] = [];
  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/dashboard' };

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
  statusOptions: { label: string; value: string }[] = [
    { label: 'Unresolved', value: 'Unresolved' },
    { label: 'Resolved', value: 'Resolved' },
    { label: 'Referred', value: 'Referred' },
  ];

  reportedToMgmtHr = false;
  survivorSatisfied = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private lookupService: LookupService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {}

  async ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const parsedId = Number(idParam);
    this.gbvGrievanceId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
    const statusParam = this.route.snapshot.queryParamMap.get('status');
    if (statusParam) {
      this.grievanceStatusLabel = this.getStatusLabel(statusParam);
      this.grievanceStatusBadgeClass = this.getStatusBadgeClass(statusParam);
      this.currentProcessStatus = this.getStatusLabel(statusParam);
    }
    this.initBreadcrumb();

    if (!this.gbvGrievanceId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No GBV grievance ID provided for processing.',
      });
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    try {
      this.initForm();
      this.subscribeToFormChanges();
      await Promise.all([
        this.loadAllLookups(),
        this.fetchGrievanceDetails(this.gbvGrievanceId),
        this.fetchProcessHistory(this.gbvGrievanceId),
      ]);
    } catch (error) {
      console.error('Initialization error:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load data for grievance processing.',
      });
      this.isLoading = false;
    } finally {
      this.cdr.detectChanges();
    }
  }

  initBreadcrumb() {
    this.breadcrumbItems = [{ label: 'GBV Grievance Process' }];
  }

  onCancel(): void {
    this.router.navigate(['/gbv-management/process']);
  }

  async loadAllLookups() {
    try {
      const [statesRes, reportingChannelsRes, gendersList] = await Promise.all([
        this.lookupService.getOrFetchStateList(),
        this.apiService.GET('api/grievance/reporting-channel'),
        this.lookupService.getGenderListbyId(),
      ]);

      this.states = statesRes;
      this.reportingChannels = reportingChannelsRes?.data?.content
        ?.filter((item: any) => item.gbvChannel === true || item.ngbvChannel === true)
        ?.map((item: any) => ({ label: item.detail, value: item.id })) ?? [];
      this.genders = gendersList.map((item) => ({
        label: item.name,
        value: Number(item.id),
      }));
    } catch (error) {
      console.error('Error loading lookups:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load lookup data.',
      });
      throw error;
    }
  }

  async fetchGrievanceDetails(id: number) {
    this.isLoading = true;
    try {
      const res: any = await this.apiService.GET('api/gbv-grievance/get', { id });
      if (res?.data?.content?.length) {
        const details = res.data.content[0] as GbvGrievanceDetails;
        this.grievanceDetails = details;
        await this.loadDependentLookups(details);
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Not Found',
          detail: 'GBV grievance details not found.',
        });
        this.grievanceDetails = null;
      }
    } catch (error) {
      console.error('Error fetching grievance details:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to fetch GBV grievance details.',
      });
      this.grievanceDetails = null;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async fetchProcessHistory(id: number) {
    this.isLoadingHistory = true;
    try {
      const res: any = await this.apiService.GET('api/gbv-grievance/process/history', {
        gbvGrievanceId: id,
      });
      const history = res?.data?.content ?? [];
      this.processHistory = [...history].sort((a, b) => b.id - a.id);
      this.currentProcessStatus = this.processHistory[0]?.status ?? null;
      this.populateFormFromLatestHistory();
    } catch (error) {
      console.error('Error fetching process history:', error);
      this.processHistory = [];
      this.currentProcessStatus = null;
    } finally {
      this.isLoadingHistory = false;
      this.cdr.markForCheck();
    }
  }

  private populateFormFromLatestHistory(): void {
    if (!this.processHistory.length || !this.processForm) return;
    const latest = this.processHistory[0];
    this.processForm.patchValue({
      id: latest.id,
      gbvGrievanceId: latest.gbvGrievanceId,
      followupActionFeedback: latest.followupActionFeedback || '',
      reportedToMgmtHr: latest.reportedToMgmtHr ?? false,
      reportedDetails: latest.reportedDetails || '',
      survivorSatisfied: latest.survivorSatisfied ?? false,
      survivorDetails: latest.survivorDetails || '',
      afterMgmtActionClosedAt: latest.afterMgmtActionClosedAt ? new Date(latest.afterMgmtActionClosedAt) : null,
      status: this.normalizeStatusForApi(latest.status) || null,
    });
    this.reportedToMgmtHr = !!latest.reportedToMgmtHr;
    this.survivorSatisfied = !!latest.survivorSatisfied;
    if (this.reportedToMgmtHr) {
      this.processForm.get('reportedDetails')?.enable();
    }
    if (this.survivorSatisfied) {
      this.processForm.get('survivorDetails')?.enable();
    }
  }

  async loadDependentLookups(details: GbvGrievanceDetails) {
    const promises: Promise<any>[] = [];
    if (details.stateId) {
      promises.push(
        this.lookupService
          .getCountyListByStateId(String(details.stateId))
          .then((res) => (this.counties = res))
      );
    }
    if (details.countyId) {
      promises.push(
        this.lookupService
          .getPayamListByCountyId(String(details.countyId))
          .then((res) => (this.payams = res))
      );
    }
    if (details.payamId) {
      promises.push(
        this.lookupService
          .getBomaListByPayamId(String(details.payamId))
          .then((res) => (this.bomas = res))
      );
    }
    await Promise.all(promises);
    this.cdr.markForCheck();
  }

  get isProcessFormDisabled(): boolean {
    return this.isResolvedStatus(this.currentProcessStatus || this.grievanceStatusLabel);
  }

  private isResolvedStatus(status: string | number | null | undefined): boolean {
    if (status === null || status === undefined || status === '') return false;
    const normalized = String(status).trim().toLowerCase();
    return normalized === '5' || normalized === 'resolved';
  }

  viewProcessHistoryDetail(history: GbvProcessHistoryItem) {
    this.selectedHistoryDetail = history;
    this.displayHistoryDetailDialog = true;
  }

  initForm(): void {
    this.processForm = this.fb.group({
      id: [null],
      gbvGrievanceId: [this.gbvGrievanceId, Validators.required],
      followupActionFeedback: ['', Validators.required],
      reportedToMgmtHr: [false],
      reportedDetails: [{ value: '', disabled: true }],
      survivorSatisfied: [false],
      survivorDetails: [{ value: '', disabled: true }],
      afterMgmtActionClosedAt: [null],
      status: [null, Validators.required],
    });
  }

  subscribeToFormChanges(): void {
    this.processForm.get('reportedToMgmtHr')?.valueChanges.subscribe((val: boolean) => {
      this.reportedToMgmtHr = !!val;
      const ctrl = this.processForm.get('reportedDetails');
      if (val) {
        ctrl?.enable();
      } else {
        ctrl?.setValue('');
        ctrl?.disable();
      }
      this.cdr.markForCheck();
    });

    this.processForm.get('survivorSatisfied')?.valueChanges.subscribe((val: boolean) => {
      this.survivorSatisfied = !!val;
      const ctrl = this.processForm.get('survivorDetails');
      if (val) {
        ctrl?.enable();
      } else {
        ctrl?.setValue('');
        ctrl?.disable();
      }
      this.cdr.markForCheck();
    });
  }

  private formatDateTimeForApi(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  private normalizeStatusForApi(
    status: string | number | null | undefined
  ): 'Unresolved' | 'Resolved' | 'Referred' | '' {
    if (status === null || status === undefined || status === '') return '';

    const normalized = String(status).trim().toLowerCase();
    if (normalized === '1' || normalized === 'unresolved') return 'Unresolved';
    if (normalized === '5' || normalized === 'resolved') return 'Resolved';
    if (
      normalized === '15' ||
      normalized === 'referred' ||
      normalized === 'reffered'
    ) {
      return 'Referred';
    }
    return '';
  }

  onSubmit(): void {
    if (this.processForm.invalid || !this.gbvGrievanceId) {
      this.processForm.markAllAsTouched();
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields.',
        icon: 'warning',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }

    this.isSubmitting = true;
    const raw = this.processForm.getRawValue();
    const formData = new FormData();

    formData.append('id', raw.id ? String(raw.id) : '');
    formData.append('gbvGrievanceId', String(this.gbvGrievanceId));
    formData.append('followupActionFeedback', raw.followupActionFeedback || '');
    formData.append('reportedToMgmtHr', String(raw.reportedToMgmtHr ?? false));
    formData.append('reportedDetails', raw.reportedDetails || '');
    formData.append('survivorSatisfied', String(raw.survivorSatisfied ?? true));
    formData.append('survivorDetails', raw.survivorDetails || '');
    formData.append(
      'afterMgmtActionClosedAt',
      this.formatDateTimeForApi(raw.afterMgmtActionClosedAt)
    );
    formData.append('status', this.normalizeStatusForApi(raw.status));

    this.apiService
      .POST('api/gbv-grievance/process', formData, 'global', {
        headers: { 'Content-Type': undefined },
      })
      .then(async (res: any) => {
        const result = res?.data;
        if (
          result?.code === 200 ||
          result?.statusCode === 200 ||
          result?.success === true
        ) {
          Swal.fire({
            title: 'Success',
            text: result?.message || 'GBV grievance processed successfully.',
            icon: 'success',
            confirmButtonColor: '#0d6efd',
          });
           this.router.navigate(['/gbv-management/process']);
        } else {
          Swal.fire({
            title: 'Process Failed',
            text: result?.message || 'Failed to process GBV grievance.',
            icon: 'error',
            confirmButtonColor: '#0d6efd',
          });
        }
      })
      .catch((error: any) => {
        console.error('Error processing grievance:', error);
        const errorMessage =
          error?.response?.data?.message ||
          'An error occurred while processing the GBV grievance.';
        Swal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonColor: '#0d6efd',
        });
      })
      .finally(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      });
  }

  openProcessDialog(): void {
    if (this.isProcessFormDisabled) {
      return;
    }
    this.populateFormFromLatestHistory();
    this.displayProcessDialog = true;
  }

  get isEditMode(): boolean {
    return this.processHistory.length > 0;
  }

  onReset(): void {
    if (this.isEditMode) {
      this.populateFormFromLatestHistory();
    } else {
      this.processForm.reset({
        id: null,
        gbvGrievanceId: this.gbvGrievanceId,
        followupActionFeedback: '',
        reportedToMgmtHr: false,
        reportedDetails: '',
        survivorSatisfied: false,
        survivorDetails: '',
        afterMgmtActionClosedAt: null,
        status: null,
      });
      this.reportedToMgmtHr = false;
      this.survivorSatisfied = false;
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
    const item = this.genders.find((g) => g.value === Number(id));
    return item ? item.label : String(id);
  }

  getReportingChannelName(id: number | string): string {
    const item = this.reportingChannels.find((rc) => rc.value === Number(id));
    return item ? item.label : String(id);
  }

  getIncidentReportedByName(id: number): string {
    const item = this.incidentReporters.find((ir) => ir.value === Number(id));
    return item ? item.label : String(id);
  }

  getSelectionCriteriaName(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '--';
    }

    const item = this.lookupService.getSelectionCriteriaEnum().find(
      (selection: any) =>
        String(selection.id) === String(value) || String(selection.value) === String(value)
    );

    return item ? item.value : String(value);
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
    if (s === '15' || s === 'referred' || s === 'reffered') return 'Referred';
    return 'Unresolved';
  }

  getStatusBadgeClass(statusValue: string | null | undefined): string {
    const normalized = String(statusValue || '').toLowerCase();
    if (normalized === 'resolved') return 'bg-success';
    if (normalized === 'reffered' || normalized === 'referred') return 'bg-danger';
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

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  getFilenameFromUrl(url: string): string {
    if (!url) return 'Attachment';
    const urlWithoutQuery = url.split('?')[0];
    const parts = urlWithoutQuery.split('/');
    return decodeURIComponent(parts[parts.length - 1]) || 'Attachment';
  }

  async downloadGrievanceAttachment(): Promise<void> {
    const attachmentUrl = this.grievanceDetails?.grievanceAttachmentUrl;
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

    const filename = this.grievanceDetails?.grievanceAttachmentFilename || this.getFilenameFromUrl(attachmentUrl);
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

      const contentType = response.headers?.get?.('Content-Type') || this.getMimeType(filename);
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
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

  async downloadConsentFormAttachment(): Promise<void> {
    const attachmentUrl = this.grievanceDetails?.consentFormAttachmentUrl;
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

    const filename = this.grievanceDetails?.consentFormAttachmentFilename || this.getFilenameFromUrl(attachmentUrl);
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

      const contentType = response.headers?.get?.('Content-Type') || this.getMimeType(filename);
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
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
