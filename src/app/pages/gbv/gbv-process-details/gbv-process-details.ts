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
import Swal from 'sweetalert2';
import { FileUploadModule } from 'primeng/fileupload';
import { InputNumberModule } from 'primeng/inputnumber';

interface GbvGrievanceDetails {
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
  status: string;
}

interface AccusedType {
  label: string;
  value: number;
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
    FileUploadModule,
    InputNumberModule,
  ],
  providers: [MessageService],
  templateUrl: './gbv-process-details.html',
  styleUrl: './gbv-process-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GbvProcessDetails implements OnInit {
  gbvGrievanceId: number | null = null;
  grievanceDetails: GbvGrievanceDetails | null = null;
  processForm!: FormGroup;
  isLoading = true;
  isSubmitting = false;

  breadcrumbItems: MenuItem[] = [];
  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/dashboard' };

  states: LookupItem[] = [];
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

  furtherActionRequired: boolean = false;
  investigationCarriedOut: boolean = false;
  appealLodged: boolean = false;

  feedbackAttachmentFile: File | null = null;
  investigationReportAttachmentFile: File | null = null;

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
    this.gbvGrievanceId = Number(this.route.snapshot.paramMap.get('id'));
    this.initBreadcrumb();

    if (!this.gbvGrievanceId) {
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
      ]);
    } catch (error) {
      console.error('Initialization error:', error);
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
    const statesRes = await this.lookupService.getOrFetchStateList();
    this.states = statesRes;
    this.accusedStates = statesRes;
  }

  async fetchGrievanceDetails(id: number) {
    this.isLoading = true;
    try {
      const res: any = await this.apiService.GET(`api/gbv/get?id=${id}`);
      if (res?.data?.content?.length) {
        this.grievanceDetails = res.data.content[0];
      }
    } catch (error) {
      console.error('Error fetching grievance details:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  initForm(): void {
    this.processForm = this.fb.group({
      gbvGrievanceId: [this.gbvGrievanceId, Validators.required],
      actionTakenInResponse: ['', Validators.required],
      actionTakenBy: ['', Validators.required],
      resolvedOn: [null, Validators.required],
      feedbackToComplainant: ['', Validators.required],
      feedbackToComplainantAttachmentFile: [null],
      accusedName: [''],
      accusedDetails: [''],
      accusedOtherDetails: [''],
      accusedType: [null],
      accusedState: [null],
      accusedCounty: [{ value: null, disabled: true }],
      accusedPayam: [{ value: null, disabled: true }],
      accusedBoma: [{ value: null, disabled: true }],
      furtherActionRequired: [false],
      furtherRequiredActionDetails: [{ value: '', disabled: true }],
      appealLodged: [false],
      appealedOn: [{ value: null, disabled: true }],
      appealOutcomeSatisfactory: [{ value: false, disabled: true }],
      afterAppealClosedOn: [{ value: null, disabled: true }],
      unresolvedRecommendedAction: [''],
      investigationCarriedOut: [false],
      investigatorName: [{ value: '', disabled: true }],
      investigatorDesignation: [{ value: '', disabled: true }],
      investigationCompletedOn: [{ value: null, disabled: true }],
      investigationFindings: [{ value: '', disabled: true }],
      investigationReportAttachmentFile: [null],
      actionAfterInvestigation: [''],
      status: [null, Validators.required],
    });
  }

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
    this.processForm.get('furtherActionRequired')?.valueChanges.subscribe((val: boolean) => {
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

    this.processForm.get('investigationCarriedOut')?.valueChanges.subscribe((val: boolean) => {
      this.investigationCarriedOut = val;
      const controls = ['investigatorName', 'investigatorDesignation', 'investigationCompletedOn', 'investigationFindings'];
      controls.forEach(c => {
        const ctrl = this.processForm.get(c);
        if (val) {
          ctrl?.enable();
          ctrl?.setValidators(Validators.required);
        } else {
          ctrl?.disable();
          ctrl?.clearValidators();
          ctrl?.setValue(null);
        }
        ctrl?.updateValueAndValidity();
      });
      this.cdr.detectChanges();
    });

    this.processForm.get('appealLodged')?.valueChanges.subscribe((val: boolean) => {
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
  }

  async onAccusedStateChange(state: LookupItem | null) {
    this.processForm.get('accusedCounty')?.reset({ value: null, disabled: true });
    this.processForm.get('accusedPayam')?.reset({ value: null, disabled: true });
    this.processForm.get('accusedBoma')?.reset({ value: null, disabled: true });
    this.accusedCounties = [];
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

  onFeedbackAttachmentSelect(event: any): void {
    this.feedbackAttachmentFile = event.files[0];
  }

  onInvestigationReportAttachmentSelect(event: any): void {
    this.investigationReportAttachmentFile = event.files[0];
  }

  onSubmit(): void {
    if (this.processForm.invalid) {
      this.processForm.markAllAsTouched();
      Swal.fire('Validation Error', 'Please fill in all required fields.', 'warning');
      return;
    }

    this.isSubmitting = true;
    const rawValues = this.processForm.getRawValue();
    const formData = new FormData();

    formData.append('id', '0');
    formData.append('gbvGrievanceId', String(this.gbvGrievanceId));
    formData.append('actionTakenInResponse', rawValues.actionTakenInResponse);
    formData.append('actionTakenBy', rawValues.actionTakenBy);
    formData.append('feedbackToComplainant', rawValues.feedbackToComplainant || '');

    if (this.feedbackAttachmentFile) {
      formData.append('feedbackToComplainantAttachmentFile', this.feedbackAttachmentFile, this.feedbackAttachmentFile.name);
    }

    formData.append('accusedName', rawValues.accusedName || '');
    formData.append('accusedDetails', rawValues.accusedDetails || '');
    formData.append('accusedOtherDetails', rawValues.accusedOtherDetails || '');
    formData.append('accusedStateId', this.toIdString(rawValues.accusedState));
    formData.append('accusedCountyId', this.toIdString(rawValues.accusedCounty));
    formData.append('accusedPayamId', this.toIdString(rawValues.accusedPayam));
    formData.append('accusedBomaId', this.toIdString(rawValues.accusedBoma));
    formData.append('accusedType', rawValues.accusedType ? String(rawValues.accusedType) : '');
    formData.append('resolvedOn', this.formatDateForApi(rawValues.resolvedOn));
    formData.append('furtherActionRequired', String(rawValues.furtherActionRequired ?? false));
    formData.append('furtherRequiredActionDetails', rawValues.furtherRequiredActionDetails || '');
    formData.append('appealLodged', String(rawValues.appealLodged ?? false));
    formData.append('appealedOn', this.formatDateForApi(rawValues.appealedOn));
    formData.append('appealOutcomeSatisfactory', String(rawValues.appealOutcomeSatisfactory ?? false));
    formData.append('unresolvedRecommendedAction', rawValues.unresolvedRecommendedAction || '');
    formData.append('investigationCarriedOut', String(rawValues.investigationCarriedOut ?? false));
    formData.append('investigatorName', rawValues.investigatorName || '');
    formData.append('investigatorDesignation', rawValues.investigatorDesignation || '');
    formData.append('investigationCompletedOn', this.formatDateForApi(rawValues.investigationCompletedOn));
    formData.append('investigationFindings', rawValues.investigationFindings || '');

    if (this.investigationReportAttachmentFile) {
      formData.append('investigationReportAttachment', this.investigationReportAttachmentFile, this.investigationReportAttachmentFile.name);
    }

    formData.append('actionAfterInvestigation', rawValues.actionAfterInvestigation || '');
    formData.append('afterAppealClosedOn', this.formatDateForApi(rawValues.afterAppealClosedOn));
    formData.append('status', rawValues.status);

    this.apiService
      .POST('api/gbv/process', formData, 'global')
      .then((res: any) => {
        const result = res?.data;
        if (result && (result.code === 200 || result.status === 'success')) {
          Swal.fire('Success!', result.message || 'Grievance processed successfully.', 'success');
          this.router.navigate(['/gbv-management/process']);
        } else {
          Swal.fire('Failed', result?.message || 'Failed to process grievance.', 'error');
        }
      })
      .catch((err: any) => {
        console.error('Error processing grievance', err);
        Swal.fire('Error!', 'An error occurred while processing the grievance.', 'error');
      })
      .finally(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      });
  }

  formatDisplayDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('en-GB').format(date);
  }
}
