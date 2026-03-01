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
  status: string; // Assuming status is returned as a string
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
  ],
  providers: [MessageService],
  templateUrl: './non-gbv-process-details.html',
  styleUrl: './non-gbv-process-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonGbvProcessDetails implements OnInit {
  ngbvGrievanceId: number | null = null;
  grievanceDetails: NonGbvGrievanceDetails | null = null;
  processForm!: FormGroup;
  isLoading = true;
  isSubmitting = false;

  breadcrumbItems: MenuItem[] = [];
  breadcrumbHome: MenuItem = { icon: 'fas fa-home', routerLink: '/dashboard' };

  // Lookups
  states: LookupItem[] = [];
  counties: LookupItem[] = [];
  payams: LookupItem[] = [];
  bomas: LookupItem[] = [];
  accusedStates: LookupItem[] = []; // for accused
  accusedCounties: LookupItem[] = []; // for accused
  accusedPayams: LookupItem[] = []; // for accused
  accusedBomas: LookupItem[] = []; // for accused
  accusedTypes: AccusedType[] = [
    { label: 'Individual', value: 1 },
    { label: 'Group', value: 2 },
  ];
  statusOptions: { label: string; value: string }[] = [
    { label: 'Resolved', value: 'Resolved' },
    { label: 'Unresolved', value: 'Unresolved' },
  ];
  genders: LookupItem[] = [];
  reportingChannels: LookupItem[] = [];
  grievanceCategories: LookupItem[] = []; // Categories (parent)
  grievanceTypes: LookupItem[] = []; // Detailed types (child)

  // Form conditional flags
  furtherActionRequired: boolean = false;
  investigationCarriedOut: boolean = false;
  escalatedReferredExternally: boolean = false;
  appealLodged: boolean = false;
  appealOutcomeSatisfactory: boolean = false; // Not directly used as a flag, but depends on appealLodged

  // File attachments
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
    this.ngbvGrievanceId = Number(this.route.snapshot.paramMap.get('id'));
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
      await this.loadAllLookups(); // Load all lookups first
      await this.fetchGrievanceDetails(this.ngbvGrievanceId);
      this.initForm(); // Initialize form after details are fetched and lookups loaded
      this.subscribeToFormChanges(); // Subscribe to form changes for conditional logic
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
    this.breadcrumbItems = [{ label: 'Non-GBV Grievance Process' }];
  }

  async loadAllLookups() {
    try {
      const [
        statesRes,
        categoriesRes,
        reportingChannelsRes,
        gendersList,
        // Add other global lookups here
      ] = await Promise.all([
        this.lookupService.getOrFetchStateList(),
        this.apiService.GET('api/grievance/type'),
        this.apiService.GET('api/grievance/reporting-channel'),
        this.lookupService.getGenderListbyId(),
      ]);

      this.states = statesRes;
      this.accusedStates = statesRes; // Accused uses same states
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
      throw error; // Re-throw to stop further initialization if lookups fail
    }
  }

  async fetchGrievanceDetails(id: number) {
    this.isLoading = true;
    try {
      const res: any = await this.apiService.GET(`api/ngbv-grievance/get?id=${id}`);
      if (res?.data?.content?.length) {
        this.grievanceDetails = res.data.content[0];
        // Now load dependent lookups for the initial grievance details display
        await this.loadGrievanceDependentLookups(this.grievanceDetails);
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
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // Load lookups specific to the fetched grievance details for display
  async loadGrievanceDependentLookups(details: NonGbvGrievanceDetails) {
    if (details.stateId) {
      this.lookupService.getCountyListByStateId(String(details.stateId)).then(data => this.counties = data);
    }
    if (details.countyId) {
      this.lookupService.getPayamListByCountyId(String(details.countyId)).then(data => this.payams = data);
    }
    if (details.payamId) {
      this.lookupService.getBomaListByPayamId(String(details.payamId)).then(data => this.bomas = data);
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


  initForm(): void {
    this.processForm = this.fb.group({
      ngbvGrievanceId: [this.ngbvGrievanceId, Validators.required],
      actionTakenInResponse: ['', Validators.required],
      actionTakenBy: ['', Validators.required],
      feedbackToComplainant: [''],
      feedbackToComplainantAttachmentUrl: [''],
      feedbackToComplainantAttachmentFile: [null],
      accusedName: [''],
      accusedDetails: [''],
      accusedOtherDetails: [''],
      accusedState: [null],
      accusedCounty: [{ value: null, disabled: true }],
      accusedPayam: [{ value: null, disabled: true }],
      accusedBoma: [{ value: null, disabled: true }],
      accusedType: [null],
      resolvedOn: [null, Validators.required],
      furtherActionRequired: [false],
      furtherRequiredActionDetails: [{ value: '', disabled: true }],
      escalatedReferredExternally: [false],
      appealLodged: [false],
      appealedOn: [{ value: null, disabled: true }],
      appealOutcomeSatisfactory: [{ value: false, disabled: true }],
      unresolvedRecommendedAction: [''],
      investigationCarriedOut: [false],
      investigatorName: [{ value: '', disabled: true }],
      investigatorDesignation: [{ value: '', disabled: true }],
      investigationCompletedOn: [{ value: null, disabled: true }],
      investigationFindings: [{ value: '', disabled: true }],
      investigationReportAttachmentUrl: [''],
      investigationReportAttachmentFile: [null],
      actionAfterInvestigation: [''],
      afterAppealClosedOn: [{ value: null, disabled: true }],
      status: [null, Validators.required], // Resolved or Unresolved
    });
  }

  subscribeToFormChanges(): void {
    // Further Action Required
    this.processForm.get('furtherActionRequired')?.valueChanges.subscribe(val => {
      this.furtherActionRequired = val;
      if (val) {
        this.processForm.get('furtherRequiredActionDetails')?.enable();
        this.processForm.get('furtherRequiredActionDetails')?.setValidators(Validators.required);
      } else {
        this.processForm.get('furtherRequiredActionDetails')?.disable();
        this.processForm.get('furtherRequiredActionDetails')?.clearValidators();
        this.processForm.get('furtherRequiredActionDetails')?.setValue('');
      }
      this.processForm.get('furtherRequiredActionDetails')?.updateValueAndValidity();
      this.cdr.detectChanges();
    });

    // Investigation Carried Out
    this.processForm.get('investigationCarriedOut')?.valueChanges.subscribe(val => {
      this.investigationCarriedOut = val;
      const investigatorNameControl = this.processForm.get('investigatorName');
      const investigatorDesignationControl = this.processForm.get('investigatorDesignation');
      const investigationCompletedOnControl = this.processForm.get('investigationCompletedOn');
      const investigationFindingsControl = this.processForm.get('investigationFindings');

      if (val) {
        investigatorNameControl?.enable();
        investigatorDesignationControl?.enable();
        investigationCompletedOnControl?.enable();
        investigationFindingsControl?.enable();
        investigatorNameControl?.setValidators(Validators.required);
        investigatorDesignationControl?.setValidators(Validators.required);
        investigationCompletedOnControl?.setValidators(Validators.required);
        investigationFindingsControl?.setValidators(Validators.required);
      } else {
        investigatorNameControl?.disable();
        investigatorDesignationControl?.disable();
        investigationCompletedOnControl?.disable();
        investigationFindingsControl?.disable();
        investigatorNameControl?.clearValidators();
        investigatorDesignationControl?.clearValidators();
        investigationCompletedOnControl?.clearValidators();
        investigationFindingsControl?.clearValidators();
        investigatorNameControl?.setValue('');
        investigatorDesignationControl?.setValue('');
        investigationCompletedOnControl?.setValue(null);
        investigationFindingsControl?.setValue('');
      }
      investigatorNameControl?.updateValueAndValidity();
      investigatorDesignationControl?.updateValueAndValidity();
      investigationCompletedOnControl?.updateValueAndValidity();
      investigationFindingsControl?.updateValueAndValidity();
      this.cdr.detectChanges();
    });

    // Appeal Lodged
    this.processForm.get('appealLodged')?.valueChanges.subscribe(val => {
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

  onFeedbackAttachmentSelect(event: any): void {
    this.feedbackAttachmentFile = event.files[0];
  }

  onInvestigationReportAttachmentSelect(event: any): void {
    this.investigationReportAttachmentFile = event.files[0];
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

    formData.append('ngbvGrievanceId', String(this.ngbvGrievanceId));
    formData.append('actionTakenInResponse', rawValues.actionTakenInResponse);
    formData.append('actionTakenBy', rawValues.actionTakenBy);
    formData.append('feedbackToComplainant', rawValues.feedbackToComplainant || '');
    if (this.feedbackAttachmentFile) {
      formData.append('feedbackToComplainantAttachmentFile', this.feedbackAttachmentFile, this.feedbackAttachmentFile.name);
    }
    formData.append('accusedName', rawValues.accusedName || '');
    formData.append('accusedDetails', rawValues.accusedDetails || '');
    formData.append('accusedOtherDetails', rawValues.accusedOtherDetails || '');
    formData.append('accusedStateId', rawValues.accusedState?.id || '');
    formData.append('accusedCountyId', rawValues.accusedCounty?.id || '');
    formData.append('accusedPayamId', rawValues.accusedPayam?.id || '');
    formData.append('accusedBomaId', rawValues.accusedBoma?.id || '');
    formData.append('accusedType', rawValues.accusedType || '');

    const resolvedDate = rawValues.resolvedOn ? new Date(rawValues.resolvedOn).toISOString().split('T')[0] : '';
    formData.append('resolvedOn', resolvedDate);

    formData.append('furtherActionRequired', String(rawValues.furtherActionRequired));
    formData.append('furtherRequiredActionDetails', rawValues.furtherRequiredActionDetails || '');
    formData.append('escalatedReferredExternally', String(rawValues.escalatedReferredExternally));
    formData.append('appealLodged', String(rawValues.appealLodged));

    const appealedOnDate = rawValues.appealedOn ? new Date(rawValues.appealedOn).toISOString().split('T')[0] : '';
    formData.append('appealedOn', appealedOnDate);

    formData.append('appealOutcomeSatisfactory', String(rawValues.appealOutcomeSatisfactory));
    formData.append('unresolvedRecommendedAction', rawValues.unresolvedRecommendedAction || '');
    formData.append('investigationCarriedOut', String(rawValues.investigationCarriedOut));
    formData.append('investigatorName', rawValues.investigatorName || '');
    formData.append('investigatorDesignation', rawValues.investigatorDesignation || '');

    const investigationCompletedOnDate = rawValues.investigationCompletedOn ? new Date(rawValues.investigationCompletedOn).toISOString().split('T')[0] : '';
    formData.append('investigationCompletedOn', investigationCompletedOnDate);

    formData.append('investigationFindings', rawValues.investigationFindings || '');
    if (this.investigationReportAttachmentFile) {
      formData.append('investigationReportAttachment', this.investigationReportAttachmentFile, this.investigationReportAttachmentFile.name);
    }
    formData.append('actionAfterInvestigation', rawValues.actionAfterInvestigation || '');

    const afterAppealClosedOnDate = rawValues.afterAppealClosedOn ? new Date(rawValues.afterAppealClosedOn).toISOString().split('T')[0] : '';
    formData.append('afterAppealClosedOn', afterAppealClosedOnDate);
    formData.append('status', rawValues.status);

    this.apiService
      .POST('api/ngbv-grievance/process', formData, 'global', {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res: any) => {
        const result = res?.data;
        if (result && result.code === 200) {
          Swal.fire({
            title: 'Success!',
            text: result.message || 'Grievance processed successfully.',
            icon: 'success',
            confirmButtonColor: '#0d6efd',
          });
          this.router.navigate(['/non-gbv-management/process']); // Navigate back to list
        } else {
          Swal.fire({
            title: 'Failed',
            text: result?.message || 'Failed to process grievance.',
            icon: 'error',
            confirmButtonColor: '#0d6efd',
          });
        }
      })
      .catch((err: any) => {
        console.error('Error processing grievance', err);
        Swal.fire({
          title: 'Error!',
          text: 'An error occurred while processing the grievance.',
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
    this.accusedCounties = [];
    this.accusedPayams = [];
    this.accusedBomas = [];
    this.cdr.detectChanges();
  }

  // Helper functions to get names from IDs (similar to NonGbvDetails)
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

  getStatusLabel(statusValue: string | number): string {
    const status = this.statusOptions.find(s => s.value === statusValue);
    return status ? status.label : String(statusValue);
  }
}
