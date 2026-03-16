import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { LookupService } from '../../../services/lookup.service';
import { ApiService } from '../../../services/api.service';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-gbv-management',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    ReactiveFormsModule,
    CardModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    SelectButtonModule,
    ButtonModule,
    InputNumberModule,
    BreadcrumbModule,
  ],
  templateUrl: './gbv-management.html',
  styleUrl: './gbv-management.scss',
})
export class GBVManagement implements OnInit, OnDestroy {
  private static readonly PHONE_REGEX = /^\+?[0-9]{7,15}$/;
  private static readonly NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]*$/;
  private static readonly MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
  private static readonly ALLOWED_FILE_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'];

  gbvForm!: FormGroup;
  today: Date = new Date();
  isLoading = false;
  private subscriptions: Subscription[] = [];

  items: MenuItem[] | undefined;
  home: MenuItem | undefined;

  states: any[] = [];
  counties: any[] = [];
  payams: any[] = [];
  bomas: any[] = [];

  reportingChannels: any[] = [];
  genders: any[] = [];

  incidentReporters = [
    { label: 'Survivor', value: 1 },
    { label: 'Family Member', value: 2 },
    { label: 'Other', value: 3 },
  ];

  beneficiaryOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  yesNoOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  // ✅ Fixed: Selection criteria uses the correct enum
  selectionCriteriaOptions = [
    { label: 'Public Works', value: 0 },
    { label: 'Direct Income Support', value: 1 },
  ];

  grievanceAttachmentFile: File | null = null;
  consentAttachmentFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private lookupService: LookupService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.items = [{ label: 'GBV Management' }];
    this.home = { icon: 'pi pi-home', routerLink: '/dashboard' };

    this.initForm();
    this.loadStates();
    this.loadGenders();
    this.loadReportingChannels();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  initForm(): void {
    this.gbvForm = this.fb.group({
      id: [0],
      trackingNumber: [{ value: '', disabled: true }],
      stateId: [null, Validators.required],
      countyId: [null, Validators.required],
      payamId: [null, Validators.required],
      bomaId: [null, Validators.required],
      incidentOccurredAt: [null, [Validators.required, this.noFutureDateValidator()]],
      contactFocalPersonName: [
        '',
        [
          Validators.required,
          this.trimRequiredValidator(),
          Validators.maxLength(120),
          Validators.pattern(GBVManagement.NAME_REGEX),
        ],
      ],
      incidentReportedBy: [null],
      incidentReportedByOtherDesc: ['', [Validators.maxLength(200)]],
      reportingChannelId: [null, Validators.required],
      reportingChannelOther: ['', [Validators.maxLength(200)]],
      complainantContactNumber: [
        '',
        [Validators.maxLength(20), Validators.pattern(GBVManagement.PHONE_REGEX)],
      ],
      complainantGender: [null, Validators.required],
      ageOfSurvivor: [null, [Validators.required, Validators.min(0), Validators.max(120)]],

      // ✅ Fixed: Use nullNotAllowedValidator instead of Validators.required for boolean select-buttons
      complainantBeneficiary: [null, this.nullNotAllowedValidator()],

      complainantBeneficiarySelectionCriteria: [null],
      suspectKnown: [null],
      suspectAssociatedWithProject: [null],
      suspectDetails: ['', [Validators.maxLength(1000)]],
      recommendedReferralServiceId: [null, [Validators.min(0)]],
      grievanceDescription: [
        '',
        [
          Validators.required,
          this.trimRequiredValidator(),
          Validators.minLength(10),
          Validators.maxLength(3000),
        ],
      ],
      grievanceAttachmentUrl: ['', [this.optionalUrlValidator()]],
      grievanceAttachmentFile: [null],
      grievanceAttachmentBytes: [''],
      grievanceAttachmentFilename: [''],

      // ✅ Fixed: Use nullNotAllowedValidator for boolean select-buttons
      verbalConsentGranted: [null, this.nullNotAllowedValidator()],
      consentSigned: [null, this.nullNotAllowedValidator()],

      consentFormAttachmentUrl: ['', [this.optionalUrlValidator()]],
      consentFormAttachmentFile: [null],
      consentFormAttachmentBytes: [''],
      consentFormAttachmentFilename: [''],
    });

    this.registerConditionalValidationWatchers();
    this.applyConditionalValidators();
  }

  loadStates(): void {
    this.lookupService.getOrFetchStateList().then((data) => {
      this.states = data.map((item) => ({
        label: item.name,
        value: parseInt(item.id, 10),
      }));
      this.cdr.detectChanges();
    });
  }

  loadGenders(): void {
    const data = this.lookupService.getGenderListbyId();
    this.genders = data.map((item) => ({
      label: item.name,
      value: parseInt(item.id, 10),
    }));
  }

  loadReportingChannels(): void {
    this.apiService
      .GET('api/grievance/reporting-channel')
      .then((res: any) => {
        const data = res?.data?.content || [];
        this.reportingChannels = data
          .filter((item: any) => item.gbvChannel === true || item.gbvChannel === undefined)
          .map((item: any) => ({
            label: item.detail,
            value: item.id,
          }));
        this.applyConditionalValidators();
        this.cdr.detectChanges();
      })
      .catch((err: any) => {
        console.error('Error fetching reporting channels', err);
      });
  }

  onStateChange(event: any): void {
    const stateId = event.value;
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.gbvForm.patchValue({ countyId: null, payamId: null, bomaId: null });

    if (stateId) {
      this.lookupService.getCountyListByStateId(stateId.toString()).then((data) => {
        this.counties = data.map((item) => ({
          label: item.name,
          value: parseInt(item.id, 10),
        }));
        this.cdr.detectChanges();
      });
    } else {
      this.cdr.detectChanges();
    }
  }

  onCountyChange(event: any): void {
    const countyId = event.value;
    this.payams = [];
    this.bomas = [];
    this.gbvForm.patchValue({ payamId: null, bomaId: null });

    if (countyId) {
      this.lookupService.getPayamListByCountyId(countyId.toString()).then((data) => {
        this.payams = data.map((item) => ({
          label: item.name,
          value: parseInt(item.id, 10),
        }));
        this.cdr.detectChanges();
      });
    } else {
      this.cdr.detectChanges();
    }
  }

  onPayamChange(event: any): void {
    const payamId = event.value;
    this.bomas = [];
    this.gbvForm.patchValue({ bomaId: null });

    if (payamId) {
      this.lookupService.getBomaListByPayamId(payamId.toString()).then((data) => {
        this.bomas = data.map((item) => ({
          label: item.name,
          value: parseInt(item.id, 10),
        }));
        this.cdr.detectChanges();
      });
    } else {
      this.cdr.detectChanges();
    }
  }

  onFileUpload(event: any, fileType: 'grievance' | 'consent'): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name?.split('.').pop()?.toLowerCase() || '';
    if (!GBVManagement.ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      Swal.fire({
        title: 'Invalid File Type',
        text: `Allowed formats: ${GBVManagement.ALLOWED_FILE_EXTENSIONS.join(', ')}`,
        icon: 'warning',
        confirmButtonColor: '#0d6efd',
      });
      event.target.value = '';
      return;
    }

    if (file.size > GBVManagement.MAX_FILE_SIZE_BYTES) {
      Swal.fire({
        title: 'File Too Large',
        text: 'Maximum allowed file size is 5 MB.',
        icon: 'warning',
        confirmButtonColor: '#0d6efd',
      });
      event.target.value = '';
      return;
    }

    if (fileType === 'grievance') {
      this.grievanceAttachmentFile = file;
      this.gbvForm.patchValue({
        grievanceAttachmentFile: file,
        grievanceAttachmentFilename: file.name,
      });
      return;
    }

    this.consentAttachmentFile = file;
    this.gbvForm.patchValue({
      consentFormAttachmentFile: file,
      consentFormAttachmentFilename: file.name,
    });
    // ✅ Re-run validators after file is set so consentFormAttachmentFile passes required check
    this.applyConditionalValidators();
  }

  private registerConditionalValidationWatchers(): void {
    const watchedControls = [
      'incidentReportedBy',
      'reportingChannelId',
      'complainantBeneficiary',
      'suspectKnown',
      'consentSigned',
    ];

    watchedControls.forEach((controlName) => {
      const control = this.gbvForm.get(controlName);
      if (!control) return;
      this.subscriptions.push(
        control.valueChanges.subscribe(() => {
          this.applyConditionalValidators();
        })
      );
    });
  }

  private applyConditionalValidators(): void {
    // incidentReportedByOtherDesc — required only when "Other" (value=3) is selected
    this.setControlValidators(
      'incidentReportedByOtherDesc',
      this.isIncidentReporterOtherSelected(),
      [Validators.maxLength(200), this.trimRequiredValidator()]
    );

    // reportingChannelOther — required only when channel label contains "other"
    this.setControlValidators(
      'reportingChannelOther',
      this.isOtherReportingChannelSelected(),
      [Validators.maxLength(200), this.trimRequiredValidator()]
    );

    // complainantBeneficiarySelectionCriteria — required only when beneficiary = true
    // ✅ Not marked as asterisk-required in UI, so no Validators.required here
    this.setControlValidators(
      'complainantBeneficiarySelectionCriteria',
      false, // not required by asterisk
      [Validators.min(0), Validators.max(999999)]
    );

    // suspectAssociatedWithProject — required only when suspectKnown = true
    // ✅ Not asterisk-required; don't add Validators.required
    this.setControlValidators(
      'suspectAssociatedWithProject',
      false
    );

    // suspectDetails — required only when suspectKnown = true
    // ✅ Not asterisk-required
    this.setControlValidators(
      'suspectDetails',
      false,
      [Validators.maxLength(1000)]
    );

    // ✅ Fixed: consentFormAttachmentFile validator checks the actual File object on the component,
    // not the form control value, so we set it invalid only if consentSigned=true AND no file uploaded
    const consentSignedControl = this.gbvForm.get('consentFormAttachmentFile');
    if (consentSignedControl) {
      if (this.gbvForm.get('consentSigned')?.value === true) {
        consentSignedControl.setValidators([this.fileRequiredValidator()]);
      } else {
        consentSignedControl.setValidators(null);
      }
      consentSignedControl.updateValueAndValidity({ emitEvent: false });
    }
  }

  private setControlValidators(
    controlName: string,
    required: boolean,
    validators: ValidatorFn[] = []
  ): void {
    const control = this.gbvForm.get(controlName);
    if (!control) return;

    const rules = required ? [Validators.required, ...validators] : validators;
    control.setValidators(rules.length ? rules : null);
    control.updateValueAndValidity({ emitEvent: false });
  }

  isIncidentReporterOtherSelected(): boolean {
    return this.gbvForm.get('incidentReportedBy')?.value === 3;
  }

  isOtherReportingChannelSelected(): boolean {
    const selectedId = this.gbvForm.get('reportingChannelId')?.value;
    if (!selectedId || !this.reportingChannels?.length) return false;

    const selected = this.reportingChannels.find((channel) => channel.value === selectedId);
    return selected?.label?.toLowerCase?.().includes('other') ?? false;
  }

  onContactNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value
      .replace(/[^\d+]/g, '')
      .replace(/(?!^)\+/g, '')
      .slice(0, 15);
    if (sanitized !== input.value) {
      input.value = sanitized;
    }
    this.gbvForm.get('complainantContactNumber')?.setValue(sanitized, { emitEvent: false });
  }

  // ✅ New validator: rejects null/undefined but accepts true and false (both valid booleans)
  private nullNotAllowedValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return control.value === null || control.value === undefined
        ? { required: true }
        : null;
    };
  }

  // ✅ New validator: checks that a file has been selected on the component instance
  private fileRequiredValidator(): ValidatorFn {
    return (_control: AbstractControl): ValidationErrors | null => {
      return this.consentAttachmentFile ? null : { required: true };
    };
  }

  private trimRequiredValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined) return null;
      if (typeof control.value !== 'string') return null;
      return control.value.trim().length ? null : { required: true };
    };
  }

  private noFutureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const date = new Date(control.value);
      if (Number.isNaN(date.getTime())) return { invalidDate: true };
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return date > today ? { futureDate: true } : null;
    };
  }

  private optionalUrlValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value || typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (!trimmed) return null;

      try {
        const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        const url = new URL(normalized);
        return url.hostname ? null : { invalidUrl: true };
      } catch {
        return { invalidUrl: true };
      }
    };
  }

  private trimTextFields(): void {
    const textFields = [
      'contactFocalPersonName',
      'incidentReportedByOtherDesc',
      'reportingChannelOther',
      'complainantContactNumber',
      'suspectDetails',
      'grievanceDescription',
      'grievanceAttachmentUrl',
      'consentFormAttachmentUrl',
    ];
    const patch: Record<string, string> = {};
    textFields.forEach((field) => {
      const value = this.gbvForm.get(field)?.value;
      if (typeof value === 'string') {
        patch[field] = value.trim();
      }
    });
    this.gbvForm.patchValue(patch, { emitEvent: false });
  }

  private formatDateForApi(value: Date | string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private appendValue(formData: FormData, key: string, value: any): void {
    if (value === null || value === undefined) {
      formData.append(key, '');
      return;
    }
    if (typeof value === 'boolean') {
      formData.append(key, String(value));
      return;
    }
    formData.append(key, String(value));
  }

  onSubmit(): void {
    this.trimTextFields();
    this.applyConditionalValidators();

    if (!this.gbvForm.valid) {
      this.gbvForm.markAllAsTouched();
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields and correct invalid inputs.',
        icon: 'warning',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }

    this.isLoading = true;
    const rawValues = this.gbvForm.getRawValue();
    const formData = new FormData();

    this.appendValue(formData, 'id', rawValues.id ?? 0);
    this.appendValue(formData, 'trackingNumber', rawValues.trackingNumber || '');
    this.appendValue(formData, 'stateId', rawValues.stateId);
    this.appendValue(formData, 'countyId', rawValues.countyId);
    this.appendValue(formData, 'payamId', rawValues.payamId);
    this.appendValue(formData, 'bomaId', rawValues.bomaId);
    this.appendValue(formData, 'incidentOccurredAt', this.formatDateForApi(rawValues.incidentOccurredAt));
    this.appendValue(formData, 'contactFocalPersonName', rawValues.contactFocalPersonName);
    this.appendValue(formData, 'incidentReportedBy', rawValues.incidentReportedBy);
    this.appendValue(formData, 'incidentReportedByOtherDesc', rawValues.incidentReportedByOtherDesc || '');
    this.appendValue(formData, 'reportingChannelId', rawValues.reportingChannelId);
    this.appendValue(formData, 'reportingChannelOther', rawValues.reportingChannelOther || '');
    this.appendValue(formData, 'complainantContactNumber', rawValues.complainantContactNumber || '');
    this.appendValue(formData, 'complainantGender', rawValues.complainantGender);
    this.appendValue(formData, 'ageOfSurvivor', rawValues.ageOfSurvivor);
    this.appendValue(formData, 'complainantBeneficiary', rawValues.complainantBeneficiary);
    this.appendValue(
      formData,
      'complainantBeneficiarySelectionCriteria',
      rawValues.complainantBeneficiarySelectionCriteria
    );
    this.appendValue(formData, 'suspectKnown', rawValues.suspectKnown);
    this.appendValue(formData, 'suspectAssociatedWithProject', rawValues.suspectAssociatedWithProject);
    this.appendValue(formData, 'suspectDetails', rawValues.suspectDetails || '');
    this.appendValue(formData, 'recommendedReferralServiceId', rawValues.recommendedReferralServiceId);
    this.appendValue(formData, 'grievanceDescription', rawValues.grievanceDescription);
    this.appendValue(formData, 'grievanceAttachmentUrl', rawValues.grievanceAttachmentUrl || '');

    if (this.grievanceAttachmentFile) {
      formData.append('grievanceAttachmentFile', this.grievanceAttachmentFile, this.grievanceAttachmentFile.name);
      this.appendValue(formData, 'grievanceAttachmentFilename', this.grievanceAttachmentFile.name);
    } else {
      this.appendValue(formData, 'grievanceAttachmentFile', '');
      this.appendValue(formData, 'grievanceAttachmentFilename', rawValues.grievanceAttachmentFilename || '');
    }

    this.appendValue(formData, 'grievanceAttachmentBytes', rawValues.grievanceAttachmentBytes || '');
    this.appendValue(formData, 'verbalConsentGranted', rawValues.verbalConsentGranted);
    this.appendValue(formData, 'consentSigned', rawValues.consentSigned);
    this.appendValue(formData, 'consentFormAttachmentUrl', rawValues.consentFormAttachmentUrl || '');

    if (this.consentAttachmentFile) {
      formData.append('consentFormAttachmentFile', this.consentAttachmentFile, this.consentAttachmentFile.name);
      this.appendValue(formData, 'consentFormAttachmentFilename', this.consentAttachmentFile.name);
    } else {
      this.appendValue(formData, 'consentFormAttachmentFile', '');
      this.appendValue(formData, 'consentFormAttachmentFilename', rawValues.consentFormAttachmentFilename || '');
    }

    this.appendValue(formData, 'consentFormAttachmentBytes', rawValues.consentFormAttachmentBytes || '');

    this.apiService
      .POST('api/gbv-grievance/save', formData, 'global', {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res: any) => {
        const result = res?.data;
        if (result && result.code === 200) {
          Swal.fire({
            title: 'Success!',
            text: result.message || 'GBV grievance submitted successfully.',
            icon: 'success',
            confirmButtonColor: '#0d6efd',
          });
          this.onReset();
        } else {
          Swal.fire({
            title: 'Failed',
            text: result?.message || 'Failed to submit GBV grievance.',
            icon: 'error',
            confirmButtonColor: '#0d6efd',
          });
        }
      })
      .catch((err: any) => {
        console.error('Error saving GBV grievance', err);
        Swal.fire({
          title: 'Error!',
          text: 'An error occurred while submitting the GBV grievance.',
          icon: 'error',
          confirmButtonColor: '#0d6efd',
        });
      })
      .finally(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      });
  }

  onReset(): void {
    this.gbvForm.reset({
      id: 0,
      trackingNumber: { value: '', disabled: true },
      complainantBeneficiary: null,
      verbalConsentGranted: null,
      consentSigned: null,
    });

    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.grievanceAttachmentFile = null;
    this.consentAttachmentFile = null;
    this.applyConditionalValidators();
    this.cdr.detectChanges();
  }
}