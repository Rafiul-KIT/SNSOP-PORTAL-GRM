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
import { FileUploadModule } from 'primeng/fileupload';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import Swal from 'sweetalert2';


interface NonGbvProcessHistoryItem {
  id: number;
  accusedType: string;
  escalatedReferredExternally: boolean;
  furtherActionRequired: boolean;
  resolvedOn: string;
  appealLodged: boolean;
  actionTakenBy: string;
  status: string;
}

interface NonGbvProcessHistoryDetail {
  id: number;
  ngbvGrievanceId: number;
  actionTakenInResponse: string;
  actionTakenBy: string;
  feedbackToComplainant: string;
  feedbackToComplainantAttachmentUrl: string;
  actionTakenbyAttachmentUrl: string;
  accusedName: string;
  accusedDetails: string;
  accusedOtherDetails: string;
  accusedStateId: number;
  accusedCountyId: number;
  accusedPayamId: number;
  accusedBomaId: number;
  accusedType: number;
  resolvedOn: string;
  furtherActionRequired: boolean;
  furtherRequiredActionDetails: string;
  escalatedReferredExternally: boolean;
  appealLodged: boolean;
  appealedOn: string;
  appealOutcomeSatisfactory: boolean;
  unresolvedRecommendedAction: string;
  investigationCarriedOut: boolean;
  investigatorName: string;
  investigatorDesignation: string;
  investigationCompletedOn: string;
  investigationFindings: string;
  investigationReportAttachmentUrl: string;
  actionAfterInvestigation: string;
  afterAppealClosedOn: string;
  detailsAttachmentsUrls: string[];
  status: string;
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
  status: string | number;
}

interface ValueLabelItem {
  label: string;
  value: any;
}

interface AccusedType {
  label: string;
  value: number;
}

@Component({
  selector: 'app-non-gbv-process-details',
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
    FileUploadModule,
    InputNumberModule,
    DialogModule,
    TableModule,
    ProgressSpinnerModule,
    ProgressBarModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './non-gbv-process-details.html',
  styleUrl: './non-gbv-process-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class NonGbvProcessDetails implements OnInit {
  today: Date = new Date();
  ngbvGrievanceId: number | null = null;
  grievanceDetails: NonGbvGrievanceDetails | null = null;
  processForm!: FormGroup;
  isLoading = true;
  isSubmitting = false;
  displayProcessDialog = false;
  isLoadingProcessData = false;
  isFurtherActionAllowed = true;
  isGrievanceResolved = false;
  grievanceStatusLabel = '';
  grievanceStatusBadgeClass = '';
  isEditMode = false;
  editProcessId: number | null = null;

  // Process History
  processHistory: NonGbvProcessHistoryItem[] = [];
  selectedHistoryDetail: NonGbvProcessHistoryDetail | null = null;
  displayHistoryDetailDialog = false;
  isLoadingHistory = false;
  isLoadingHistoryDetail = false;

  breadcrumbItems: MenuItem[] = [];
  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/dashboard' };

  // Lookups
  states: LookupItem[] = [];
  counties: LookupItem[] = [];
  payams: LookupItem[] = [];
  bomas: LookupItem[] = [];
  accusedStates: LookupItem[] = [];
  accusedCounties: LookupItem[] = [];
  accusedPayams: LookupItem[] = [];
  accusedBomas: LookupItem[] = [];
  accusedTypes: AccusedType[] = [
    { label: 'Individual', value: 1 },
    { label: 'Group', value: 2 },
  ];
  statusOptions: { label: string; value: string }[] = [
    { label: 'Resolved', value: 'Resolved' },
    { label: 'Unresolved', value: 'Unresolved' },
  ];
  genders: ValueLabelItem[] = [];
  reportingChannels: ValueLabelItem[] = [];
  grievanceCategories: ValueLabelItem[] = [];
  grievanceTypes: ValueLabelItem[] = [];

  // Form conditional flags
  furtherActionRequired: boolean = false;
  investigationCarriedOut: boolean = false;
  escalatedReferredExternally: boolean = false;
  appealLodged: boolean = false;
  appealOutcomeSatisfactory: boolean = false;

  // File attachments
  feedbackAttachmentFile: File | null = null;
  investigationReportAttachmentFile: File | null = null;
  actionTakenAttachmentFile: File | null = null;
  detailsAttachmentFiles: File[] = [];

  // Existing attachment URLs (loaded from API in edit mode)
  existingActionTakenAttachmentUrl: string | null = null;
  existingFeedbackAttachmentUrl: string | null = null;
  existingInvestigationAttachmentUrl: string | null = null;
  existingDetailsAttachmentUrls: string[] = [];

  isAttachmentDownloading = false;
  downloadProgress: Map<string, number> = new Map();
  currentDownloadProgress: number = 0;
  displayDownloadDialog = false;
  downloadDialogMessage = '';

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
    this.ngbvGrievanceId = Number(this.route.snapshot.paramMap.get('id'));
    const statusParam = this.route.snapshot.queryParamMap.get('status');
    if (statusParam) {
      this.grievanceStatusLabel = this.getStatusLabel(statusParam);
      this.grievanceStatusBadgeClass = this.getStatusBadgeClass(statusParam);
      this.isGrievanceResolved = this.checkResolved(statusParam);
    }
    this.initBreadcrumb();

    if (!this.ngbvGrievanceId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No Non-GBV Grievance ID provided for processing.',
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
        this.fetchGrievanceDetails(this.ngbvGrievanceId),
        this.fetchProcessHistory(this.ngbvGrievanceId),
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

  async fetchProcessHistory(id: number) {
    this.isLoadingHistory = true;
    try {
      const res: any = await this.apiService.GET(`api/ngbv-grievance/process/history/list?ngbvGrievanceId=${id}`);
      if (res?.data?.content) {
        this.processHistory = res.data.content;
        const latestHistory = [...this.processHistory].sort((a, b) => b.id - a.id)[0];
        this.isFurtherActionAllowed = latestHistory ? latestHistory.furtherActionRequired : true;
        if (latestHistory?.status) {
          this.grievanceStatusLabel = this.getStatusLabel(latestHistory.status);
          this.grievanceStatusBadgeClass = this.getStatusBadgeClass(latestHistory.status);
          this.isGrievanceResolved = this.checkResolved(latestHistory.status);
        }
        // If process history exists, subsequent opens should be edit mode
        if (this.processHistory.length > 0) {
          this.isEditMode = true;
          this.editProcessId = latestHistory?.id ?? null;
        }
      }
    } catch (error) {
      console.error('Error fetching process history:', error);
    } finally {
      this.isLoadingHistory = false;
      this.cdr.markForCheck();
    }
  }

  get isProcessFormDisabled(): boolean {
    return !this.isFurtherActionAllowed;
  }

  async viewProcessHistoryDetail(historyId: number) {
    this.isLoadingHistoryDetail = true;
    this.displayHistoryDetailDialog = true;
    try {
      const res: any = await this.apiService.GET(`api/ngbv-grievance/process/history?ngbvGrievanceDetailId=${historyId}`);
      if (res?.data?.content?.length) {
        this.selectedHistoryDetail = res.data.content[0];
      }
    } catch (error) {
      console.error('Error fetching history detail:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to fetch history details.',
      });
    } finally {
      this.isLoadingHistoryDetail = false;
      this.cdr.markForCheck();
    }
  }

  initBreadcrumb() {
    this.breadcrumbItems = [{ label: 'Non-GBV Grievance Process' }];
  }

  onCancel(): void {
    this.router.navigate(['/non-gbv-management/process']);
  }

  async loadAllLookups() {
    try {
      const [
        statesRes,
        categoriesRes,
        reportingChannelsRes,
        gendersList,
      ] = await Promise.all([
        this.lookupService.getOrFetchStateList(),
        this.apiService.GET('api/grievance/type'),
        this.apiService.GET('api/grievance/reporting-channel'),
        this.lookupService.getGenderListbyId(),
      ]);

      this.states = statesRes;
      this.accusedStates = statesRes;
      this.grievanceCategories = categoriesRes?.data?.content
        .filter((item: any) => item.status === true)
        .map((item: any) => ({ label: item.details, value: item.id }));
      this.reportingChannels = reportingChannelsRes?.data?.content
        .filter((item: any) => item.ngbvChannel === true)
        .map((item: any) => ({ label: item.detail, value: item.id }));
      this.genders = gendersList.map((item) => ({ label: item.name, value: parseInt(item.id) }));
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
      const res: any = await this.apiService.GET(`api/ngbv-grievance/get?id=${id}`);
      if (res?.data?.content?.length) {
        this.grievanceDetails = res.data.content[0];
        await this.loadDependentLookups(this.grievanceDetails!);
        this.isLoading = false;
        this.cdr.detectChanges();
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Not Found',
          detail: 'Grievance details not found.',
        });
        this.grievanceDetails = null;
      }
    } catch (error) {
      console.error('Error fetching grievance details:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to fetch grievance details.',
      });
      this.grievanceDetails = null;
    }

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadDependentLookups(details: NonGbvGrievanceDetails) {
    const promises: Promise<any>[] = [];
    if (details.stateId) {
      promises.push(this.lookupService.getCountyListByStateId(String(details.stateId)).then(res => this.counties = res));
    }
    if (details.countyId) {
      promises.push(this.lookupService.getPayamListByCountyId(String(details.countyId)).then(res => this.payams = res));
    }
    if (details.payamId) {
      promises.push(this.lookupService.getBomaListByPayamId(String(details.payamId)).then(res => this.bomas = res));
    }
    if (details.grievanceTypeId) {
      promises.push(this.apiService.GET(`api/grievance/detail-type`, { type: details.grievanceTypeId }).then((res: any) => {
        if (res?.data?.content) {
          this.grievanceTypes = res.data.content
            .filter((item: any) => item.status === true)
            .map((item: any) => ({ label: item.details, value: item.id }));
        }
      }));
    }
    await Promise.all(promises);
    this.cdr.markForCheck();
  }

  initForm(): void {
    this.processForm = this.fb.group({
      ngbvGrievanceId: [this.ngbvGrievanceId, Validators.required],

      // Action Taken — required per API
      actionTakenInResponse: ['', Validators.required],
      actionTakenBy: ['', Validators.required],
      resolvedOn: [null, Validators.required],
      actionTakenbyAttachmentUrl: [''],

      // Feedback — required per API spec (marked with *)
      feedbackToComplainant: ['', Validators.required],
      feedbackToComplainantAttachmentUrl: [''],
      feedbackToComplainantAttachmentFile: [null],

      // Accused — all optional per API (no * on accusedStateId etc.)
      accusedName: ['', [Validators.pattern(/^[A-Za-z\s]*$/)]],
      accusedDetails: [''],
      accusedOtherDetails: [''],
      accusedType: [null],
      // FIX #2: Removed Validators.required — these are optional per API spec
      accusedState: [null],
      accusedCounty: [{ value: null, disabled: true }],
      accusedPayam: [{ value: null, disabled: true }],
      accusedBoma: [{ value: null, disabled: true }],

      // Further Action
      furtherActionRequired: [false],
      furtherRequiredActionDetails: [{ value: '', disabled: true }],

      // Escalation
      escalatedReferredExternally: [false],

      // Appeal
      appealLodged: [false],
      appealedOn: [{ value: null, disabled: true }],
      appealOutcomeSatisfactory: [{ value: false, disabled: true }],
      afterAppealClosedOn: [{ value: null, disabled: true }],
      unresolvedRecommendedAction: [''],

      // Investigation
      investigationCarriedOut: [false],
      investigatorName: [{ value: '', disabled: true }],
      investigatorDesignation: [{ value: '', disabled: true }],
      investigationCompletedOn: [{ value: null, disabled: true }],
      investigationFindings: [{ value: '', disabled: true }],
      investigationReportAttachmentUrl: [''],
      investigationReportAttachmentFile: [null],
      actionAfterInvestigation: [{ value: '', disabled: true }],
      mainFindings: [''],

      // Final Status — required per API
      status: [null, Validators.required],
    });
  }

  // FIX #3: Safe date formatter — avoids UTC timezone shift from toISOString()
  private formatDateForApi(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toIdString(value: LookupItem | string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'object') return String(value.id ?? '');
    return String(value);
  }

  subscribeToFormChanges(): void {
    const furtherActionRequiredControl = this.processForm.get('furtherActionRequired');
    const investigationCarriedOutControl = this.processForm.get('investigationCarriedOut');
    const appealLodgedControl = this.processForm.get('appealLodged');

    // Further Action Required
    furtherActionRequiredControl?.valueChanges?.subscribe((val: boolean) => {
      this.furtherActionRequired = val;
      const detailsControl = this.processForm.get('furtherRequiredActionDetails');
      if (val) {
        detailsControl?.enable();
        detailsControl?.setValidators(Validators.required);
      } else {
        detailsControl?.disable();
        detailsControl?.clearValidators();
        detailsControl?.setValue('');
      }
      detailsControl?.updateValueAndValidity();
      this.cdr.detectChanges();
    });

    // Investigation Carried Out
    investigationCarriedOutControl?.valueChanges?.subscribe((val: boolean) => {
      this.investigationCarriedOut = val;
      const investigatorNameControl = this.processForm.get('investigatorName');
      const investigatorDesignationControl = this.processForm.get('investigatorDesignation');
      const investigationCompletedOnControl = this.processForm.get('investigationCompletedOn');
      const investigationFindingsControl = this.processForm.get('investigationFindings');
      const actionAfterInvestigationControl = this.processForm.get('actionAfterInvestigation');

      if (val) {
        investigatorNameControl?.enable();
        investigatorDesignationControl?.enable();
        investigationCompletedOnControl?.enable();
        investigationFindingsControl?.enable();
        actionAfterInvestigationControl?.enable();
        investigatorNameControl?.setValidators(Validators.required);
        investigatorDesignationControl?.setValidators(Validators.required);
        investigationCompletedOnControl?.setValidators(Validators.required);
        investigationFindingsControl?.setValidators(Validators.required);
      } else {
        investigatorNameControl?.disable();
        investigatorDesignationControl?.disable();
        investigationCompletedOnControl?.disable();
        investigationFindingsControl?.disable();
        actionAfterInvestigationControl?.disable();
        investigatorNameControl?.clearValidators();
        investigatorDesignationControl?.clearValidators();
        investigationCompletedOnControl?.clearValidators();
        investigationFindingsControl?.clearValidators();
        investigatorNameControl?.setValue('');
        investigatorDesignationControl?.setValue('');
        investigationCompletedOnControl?.setValue(null);
        investigationFindingsControl?.setValue('');
        actionAfterInvestigationControl?.setValue('');
      }
      investigatorNameControl?.updateValueAndValidity();
      investigatorDesignationControl?.updateValueAndValidity();
      investigationCompletedOnControl?.updateValueAndValidity();
      investigationFindingsControl?.updateValueAndValidity();
      actionAfterInvestigationControl?.updateValueAndValidity();
      this.cdr.detectChanges();
    });

    // Appeal Lodged
    appealLodgedControl?.valueChanges?.subscribe((val: boolean) => {
      this.appealLodged = val;
      const appealedOnControl = this.processForm.get('appealedOn');
      const appealOutcomeSatisfactoryControl = this.processForm.get('appealOutcomeSatisfactory');
      const afterAppealClosedOnControl = this.processForm.get('afterAppealClosedOn');

      if (val) {
        appealedOnControl?.enable();
        appealOutcomeSatisfactoryControl?.enable();
        afterAppealClosedOnControl?.enable();
        appealedOnControl?.setValidators(Validators.required);
      } else {
        appealedOnControl?.disable();
        appealOutcomeSatisfactoryControl?.disable();
        afterAppealClosedOnControl?.disable();
        appealedOnControl?.clearValidators();
        appealedOnControl?.setValue(null);
        appealOutcomeSatisfactoryControl?.setValue(false);
        afterAppealClosedOnControl?.setValue(null);
      }
      appealedOnControl?.updateValueAndValidity();
      appealOutcomeSatisfactoryControl?.updateValueAndValidity();
      afterAppealClosedOnControl?.updateValueAndValidity();
      this.cdr.detectChanges();
    });

    // Reset afterAppealClosedOn when appealedOn changes to a later date
    this.processForm.get('appealedOn')?.valueChanges?.subscribe((appealedDate: Date | null) => {
      const afterAppealClosedOnControl = this.processForm.get('afterAppealClosedOn');
      const closedDate = afterAppealClosedOnControl?.value;
      if (appealedDate && closedDate && new Date(closedDate) < new Date(appealedDate)) {
        afterAppealClosedOnControl?.setValue(null);
      }
    });
  }

  async openProcessDialog() {
    this.displayProcessDialog = true;
    this.isLoadingProcessData = true;
    this.cdr.markForCheck();

    try {
      if (this.isEditMode && this.editProcessId) {
        await this.loadProcessDataForEdit(this.editProcessId);
      } else {
        await this.autoPopulateLocation();
      }
    } finally {
      this.isLoadingProcessData = false;
      this.cdr.markForCheck();
    }
  }

  private async autoPopulateLocation() {
    const details = this.grievanceDetails;
    if (!details) return;

    const state = this.accusedStates.find(s => s.id === String(details.stateId)) ?? null;
    if (state) {
      this.processForm.patchValue({ accusedState: state });
      this.accusedCounties = await this.lookupService.getCountyListByStateId(state.id);
      this.processForm.get('accusedCounty')?.enable();

      const county = this.accusedCounties.find(c => c.id === String(details.countyId)) ?? null;
      if (county) {
        this.processForm.patchValue({ accusedCounty: county });
        this.accusedPayams = await this.lookupService.getPayamListByCountyId(county.id);
        this.processForm.get('accusedPayam')?.enable();

        const payam = this.accusedPayams.find(p => p.id === String(details.payamId)) ?? null;
        if (payam) {
          this.processForm.patchValue({ accusedPayam: payam });
          this.accusedBomas = await this.lookupService.getBomaListByPayamId(payam.id);
          this.processForm.get('accusedBoma')?.enable();

          const boma = this.accusedBomas.find(b => b.id === String(details.bomaId)) ?? null;
          if (boma) {
            this.processForm.patchValue({ accusedBoma: boma });
          }
        }
      }
    }
  }

  private async loadProcessDataForEdit(processId: number) {
    try {
      const res: any = await this.apiService.GET(`api/ngbv-grievance/process/history?ngbvGrievanceDetailId=${processId}`);
      const data = res?.data?.content?.[0] ?? res?.data;
      if (!data) return;

      // Patch simple fields
      this.processForm.patchValue({
        actionTakenInResponse: data.actionTakenInResponse || '',
        actionTakenBy: data.actionTakenBy || '',
        resolvedOn: data.resolvedOn ? new Date(data.resolvedOn) : null,
        feedbackToComplainant: data.feedbackToComplainant || '',
        accusedName: data.accusedName || '',
        accusedDetails: data.accusedDetails || '',
        accusedOtherDetails: data.accusedOtherDetails || '',
        accusedType: data.accusedType ?? null,
        furtherActionRequired: data.furtherActionRequired ?? false,
        furtherRequiredActionDetails: data.furtherRequiredActionDetails || '',
        escalatedReferredExternally: data.escalatedReferredExternally ?? false,
        appealLodged: data.appealLodged ?? false,
        appealedOn: data.appealedOn ? new Date(data.appealedOn) : null,
        appealOutcomeSatisfactory: data.appealOutcomeSatisfactory ?? false,
        afterAppealClosedOn: data.afterAppealClosedOn ? new Date(data.afterAppealClosedOn) : null,
        unresolvedRecommendedAction: data.unresolvedRecommendedAction || '',
        investigationCarriedOut: data.investigationCarriedOut ?? false,
        investigatorName: data.investigatorName || '',
        investigatorDesignation: data.investigatorDesignation || '',
        investigationCompletedOn: data.investigationCompletedOn ? new Date(data.investigationCompletedOn) : null,
        investigationFindings: data.investigationFindings || '',
        actionAfterInvestigation: data.actionAfterInvestigation || '',
        mainFindings: data.mainFindings || '',
        status: data.status || null,
      });

      // Load existing attachment URLs
      this.existingActionTakenAttachmentUrl = data.actionTakenbyAttachmentUrl || null;
      this.existingFeedbackAttachmentUrl = data.feedbackToComplainantAttachmentUrl || null;
      this.existingInvestigationAttachmentUrl = data.investigationReportAttachmentUrl || null;
      this.existingDetailsAttachmentUrls = data.detailsAttachmentsUrls || [];

      // Load accused location
      const stateId = data.accusedStateId;
      if (stateId) {
        const state = this.accusedStates.find(s => s.id === String(stateId)) ?? null;
        if (state) {
          this.processForm.patchValue({ accusedState: state });
          this.accusedCounties = await this.lookupService.getCountyListByStateId(state.id);
          this.processForm.get('accusedCounty')?.enable();

          const county = this.accusedCounties.find(c => c.id === String(data.accusedCountyId)) ?? null;
          if (county) {
            this.processForm.patchValue({ accusedCounty: county });
            this.accusedPayams = await this.lookupService.getPayamListByCountyId(county.id);
            this.processForm.get('accusedPayam')?.enable();

            const payam = this.accusedPayams.find(p => p.id === String(data.accusedPayamId)) ?? null;
            if (payam) {
              this.processForm.patchValue({ accusedPayam: payam });
              this.accusedBomas = await this.lookupService.getBomaListByPayamId(payam.id);
              this.processForm.get('accusedBoma')?.enable();

              const boma = this.accusedBomas.find(b => b.id === String(data.accusedBomaId)) ?? null;
              if (boma) {
                this.processForm.patchValue({ accusedBoma: boma });
              }
            }
          }
        }
      } else {
        await this.autoPopulateLocation();
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading process data for edit:', error);
      await this.autoPopulateLocation();
    }
  }

  private checkResolved(status: string | number): boolean {
    const s = String(status).toLowerCase();
    return s === '5' || s === 'resolved';
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

  // Dependent dropdowns for Accused Location
  async onAccusedStateChange(state: LookupItem | null) {
    this.processForm.get('accusedCounty')?.reset({ value: null, disabled: true });
    this.processForm.get('accusedPayam')?.reset({ value: null, disabled: true });
    this.processForm.get('accusedBoma')?.reset({ value: null, disabled: true });
    this.accusedCounties = [];
    this.accusedPayams = [];
    this.accusedBomas = [];

    if (state?.id) {
      this.accusedCounties = await this.lookupService.getCountyListByStateId(state.id);
      this.processForm.get('accusedCounty')?.enable();
    }
    this.cdr.markForCheck();
  }

  async onAccusedCountyChange(county: LookupItem | null) {
    this.processForm.get('accusedPayam')?.reset({ value: null, disabled: true });
    this.processForm.get('accusedBoma')?.reset({ value: null, disabled: true });
    this.accusedPayams = [];
    this.accusedBomas = [];

    if (county?.id) {
      this.accusedPayams = await this.lookupService.getPayamListByCountyId(county.id);
      this.processForm.get('accusedPayam')?.enable();
    }
    this.cdr.markForCheck();
  }

  async onAccusedPayamChange(payam: LookupItem | null) {
    this.processForm.get('accusedBoma')?.reset({ value: null, disabled: true });
    this.accusedBomas = [];

    if (payam?.id) {
      this.accusedBomas = await this.lookupService.getBomaListByPayamId(payam.id);
      this.processForm.get('accusedBoma')?.enable();
    }
    this.cdr.markForCheck();
  }

  onFeedbackFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    this.feedbackAttachmentFile = file;
  }

  onInvestigationFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    this.investigationReportAttachmentFile = file;
  }

  onActionTakenFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    this.actionTakenAttachmentFile = file;
  }

  onDetailsAttachmentsChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.detailsAttachmentFiles = [...this.detailsAttachmentFiles, ...Array.from(input.files)];
    input.value = '';
  }

  onViewAttachment(type: 'feedback' | 'investigation' | 'actionTaken'): void {
    const file = type === 'feedback' ? this.feedbackAttachmentFile
      : type === 'investigation' ? this.investigationReportAttachmentFile
      : this.actionTakenAttachmentFile;
    if (!file) return;
    this.openFileInNewTab(file);
  }

  onRemoveAttachment(type: 'feedback' | 'investigation' | 'actionTaken'): void {
    if (type === 'feedback') {
      this.feedbackAttachmentFile = null;
    } else if (type === 'investigation') {
      this.investigationReportAttachmentFile = null;
    } else {
      this.actionTakenAttachmentFile = null;
    }
  }

  onViewDetailsAttachment(index: number): void {
    const file = this.detailsAttachmentFiles[index];
    if (!file) return;
    this.openFileInNewTab(file);
  }

  onRemoveDetailsAttachment(index: number): void {
    this.detailsAttachmentFiles.splice(index, 1);
  }

  getFilenameFromUrl(url: string): string {
    if (!url) return 'Attachment';
    const urlWithoutQuery = url.split('?')[0];
    const parts = urlWithoutQuery.split('/');
    return decodeURIComponent(parts[parts.length - 1]) || 'Attachment';
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

  private openFileInNewTab(file: File): void {
    const blob = new Blob([file], { type: file.type || this.getMimeType(file.name) });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  viewExistingAttachment(url: string): void {
    if (!url) return;
    this.downloadAndOpenExistingAttachment(url);
  }

  async downloadAndOpenExistingAttachment(attachmentUrl: string): Promise<void> {
    const bucketName = 'grievance-files';
    const urlWithoutQuery = attachmentUrl.split('?')[0];
    const filePath = decodeURIComponent(
      urlWithoutQuery.substring(urlWithoutQuery.indexOf(bucketName) + bucketName.length + 1)
    );
    if (!filePath) return;

    const filename = this.getFilenameFromUrl(attachmentUrl);

    this.displayDownloadDialog = true;
    this.downloadDialogMessage = 'Downloading attachment...';
    this.currentDownloadProgress = 0;
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
              this.currentDownloadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            }
            this.cdr.detectChanges();
          },
        }
      );

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
      Swal.fire({ icon: 'error', title: 'Download Failed', text: 'Could not download the attachment.' });
    } finally {
      this.displayDownloadDialog = false;
      this.currentDownloadProgress = 0;
      this.downloadDialogMessage = '';
      this.cdr.detectChanges();
    }
  }

  onRemoveExistingAttachment(type: 'actionTaken' | 'feedback' | 'investigation'): void {
    if (type === 'actionTaken') this.existingActionTakenAttachmentUrl = null;
    else if (type === 'feedback') this.existingFeedbackAttachmentUrl = null;
    else this.existingInvestigationAttachmentUrl = null;
  }

  onRemoveExistingDetailsAttachment(index: number): void {
    this.existingDetailsAttachmentUrls.splice(index, 1);
  }

  onAccusedNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^A-Za-z\s]/g, '');
    this.processForm.patchValue({ accusedName: input.value }, { emitEvent: false });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  onSubmit(): void {
    if (this.processForm.invalid) {
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
    const rawValues = this.processForm.getRawValue();
    const formData = new FormData();

    formData.append('id', this.isEditMode && this.editProcessId ? String(this.editProcessId) : '');
    formData.append('ngbvGrievanceId', String(this.ngbvGrievanceId));
    formData.append('actionTakenInResponse', rawValues.actionTakenInResponse);
    formData.append('actionTakenBy', rawValues.actionTakenBy);
    formData.append('feedbackToComplainant', rawValues.feedbackToComplainant || '');

    formData.append('feedbackToComplainantAttachmentUrl', this.feedbackAttachmentFile ? '' : (this.existingFeedbackAttachmentUrl || rawValues.feedbackToComplainantAttachmentUrl || ''));
    formData.append('feedbackToComplainantAttachmentFilePath', '');
    if (this.feedbackAttachmentFile) {
      formData.append('feedbackToComplainantAttachmentFile', this.feedbackAttachmentFile, this.feedbackAttachmentFile.name);
    }

    formData.append('actionTakenbyAttachmentUrl', this.actionTakenAttachmentFile ? '' : (this.existingActionTakenAttachmentUrl || rawValues.actionTakenbyAttachmentUrl || ''));
    formData.append('actionTakenbyAttachmentFilePath', '');
    if (this.actionTakenAttachmentFile) {
      formData.append('actionTakenbyAttachment', this.actionTakenAttachmentFile, this.actionTakenAttachmentFile.name);
    }

    formData.append('accusedName', rawValues.accusedName || '');
    formData.append('accusedDetails', rawValues.accusedDetails || '');
    formData.append('accusedOtherDetails', rawValues.accusedOtherDetails || '');
    formData.append('accusedStateId', this.toIdString(rawValues.accusedState));
    formData.append('accusedCountyId', this.toIdString(rawValues.accusedCounty));
    formData.append('accusedPayamId', this.toIdString(rawValues.accusedPayam));
    formData.append('accusedBomaId', this.toIdString(rawValues.accusedBoma));
    formData.append(
      'accusedType',
      rawValues.accusedType !== null && rawValues.accusedType !== undefined
        ? String(rawValues.accusedType)
        : ''
    );

    // FIX #3: Use formatDateForApi to avoid UTC timezone shift
    formData.append('resolvedOn', this.formatDateForApi(rawValues.resolvedOn));

    formData.append('furtherActionRequired', String(rawValues.furtherActionRequired ?? false));
    formData.append('furtherRequiredActionDetails', rawValues.furtherRequiredActionDetails || '');
    formData.append('escalatedReferredExternally', String(rawValues.escalatedReferredExternally ?? false));
    formData.append('appealLodged', String(rawValues.appealLodged ?? false));

    // FIX #3: Use formatDateForApi for all date fields
    formData.append('appealedOn', this.formatDateForApi(rawValues.appealedOn));

    formData.append('appealOutcomeSatisfactory', String(rawValues.appealOutcomeSatisfactory ?? false));
    formData.append('unresolvedRecommendedAction', rawValues.unresolvedRecommendedAction || '');
    formData.append('investigationCarriedOut', String(rawValues.investigationCarriedOut ?? false));
    formData.append('investigatorName', rawValues.investigatorName || '');
    formData.append('investigatorDesignation', rawValues.investigatorDesignation || '');

    // FIX #3: Use formatDateForApi for all date fields
    formData.append('investigationCompletedOn', this.formatDateForApi(rawValues.investigationCompletedOn));

    formData.append('investigationFindings', rawValues.investigationFindings || '');

    formData.append('investigationReportAttachmentUrl', this.investigationReportAttachmentFile ? '' : (this.existingInvestigationAttachmentUrl || rawValues.investigationReportAttachmentUrl || ''));
    formData.append('investigationReportAttachmentFilePath', '');
    if (this.investigationReportAttachmentFile) {
      formData.append(
        'investigationReportAttachment',
        this.investigationReportAttachmentFile,
        this.investigationReportAttachmentFile.name
      );
    }

    formData.append('actionAfterInvestigation', rawValues.actionAfterInvestigation || '');

    // FIX #3: Use formatDateForApi for all date fields
    formData.append('afterAppealClosedOn', this.formatDateForApi(rawValues.afterAppealClosedOn));

    formData.append('mainFindings', rawValues.mainFindings || '');

    this.detailsAttachmentFiles.forEach((file) => {
      formData.append('detailsAttachments', file, file.name);
    });

    formData.append('status', rawValues.status);

    this.apiService
      .POST('api/ngbv-grievance/process', formData, 'global', {
        headers: { 'Content-Type': undefined }
      })
      .then((res: any) => {
        const result = res?.data;
        // Check for both result.code (standard success) or result.statusCode (if API returns that)
        if ((result && result.code === 200) || (result && result.statusCode === 200) || (result && result.success === true)) {
          Swal.fire({
            title: 'Success!',
            text: result.message || 'Grievance processed successfully.',
            icon: 'success',
            confirmButtonColor: '#0d6efd',
          });
          this.router.navigate(['/non-gbv-management/process']);
        } else {
          Swal.fire({
            title: 'Process Failed',
            text: result?.message || 'Failed to process grievance.',
            icon: 'error',
            confirmButtonColor: '#0d6efd',
          });
        }
      })
      .catch((err: any) => {
        console.error('Error processing grievance', err);
        
        // Extract the specific error message from the API response if available
        const errorMessage = err.response?.data?.message || 'An error occurred while processing the grievance.';
        const errorTitle = err.response?.data?.title || 'Error!';
        
        Swal.fire({
          title: errorTitle,
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

  onReset(): void {
    this.processForm.reset({
      ngbvGrievanceId: this.ngbvGrievanceId,
      furtherActionRequired: false,
      investigationCarriedOut: false,
      escalatedReferredExternally: false,
      appealLodged: false,
      appealOutcomeSatisfactory: false,
      status: null,
    });
    this.feedbackAttachmentFile = null;
    this.investigationReportAttachmentFile = null;
    this.actionTakenAttachmentFile = null;
    this.detailsAttachmentFiles = [];
    this.existingActionTakenAttachmentUrl = null;
    this.existingFeedbackAttachmentUrl = null;
    this.existingInvestigationAttachmentUrl = null;
    this.existingDetailsAttachmentUrls = [];
    this.accusedCounties = [];
    this.accusedPayams = [];
    this.accusedBomas = [];
    this.cdr.detectChanges();
  }

  getStateName(id: number | string): string {
    const item = this.states.find((s) => s.id === String(id));
    return item ? item.name : String(id);
  }

  getCountyName(id: number | string, counties: LookupItem[]): string {
    const item = counties.find((c) => c.id === String(id));
    return item ? item.name : String(id);
  }

  getPayamName(id: number | string, payams: LookupItem[]): string {
    const item = payams.find((p) => p.id === String(id));
    return item ? item.name : String(id);
  }

  getBomaName(id: number | string, bomas: LookupItem[]): string {
    const item = bomas.find((b) => b.id === String(id));
    return item ? item.name : String(id);
  }

  getAccusedTypeName(id: number | string): string {
    const item = this.accusedTypes.find((at) => at.value === Number(id));
    return item ? item.label : String(id);
  }

  getGenderName(id: number | string): string {
    const item = this.genders.find((g) => g.value === id);
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

  getSelectionCriteriaName(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '--';
    }

    const item = this.lookupService.getSelectionCriteriaEnum().find(
      (selection: any) =>
        String(selection.id) === String(value) || String(selection.value) === String(value)
    );

    return item ? item.value : String(value);
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

  async downloadAttachment(): Promise<void> {
    const attachmentUrl = this.grievanceDetails?.grievanceAttachmentUrl;
    if (attachmentUrl && (attachmentUrl.startsWith('https://') )) {
      window.open(attachmentUrl, '_blank');
    } else {
      if (!attachmentUrl) {
        Swal.fire({
          icon: 'warning',
          title: 'No Attachment',
          text: 'No valid attachment found for this grievance.',
        });
        return;
      }
      const bucketName = 'grievance-files';
      const urlWithoutQuery = attachmentUrl.split('?')[0];
      const filePath = decodeURIComponent(
        urlWithoutQuery.substring(urlWithoutQuery.indexOf(bucketName) + bucketName.length + 1)
      );

      if (!filePath) {
        Swal.fire({
          icon: 'warning',
          title: 'No Attachment',
          text: 'Could not resolve attachment path.',
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
        Swal.fire({
          icon: 'error',
          title: 'Download Failed',
          text: 'Could not download the attachment. Please try again.',
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
