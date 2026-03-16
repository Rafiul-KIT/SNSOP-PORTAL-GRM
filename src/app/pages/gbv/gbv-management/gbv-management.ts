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

      contactFocalPersonName: ['', [Validators.required, this.trimRequiredValidator(), Validators.maxLength(120)]],
      incidentReportedBy: [null],
      // NO validators — syncOtherDescValidator manages them
      incidentReportedByOtherDesc: [''],
      reportingChannelId: [null, Validators.required],
      // NO validators — syncChannelOtherValidator manages them
      reportingChannelOther: [''],

      complainantContactNumber: ['', [this.optionalPatternValidator(GBVManagement.PHONE_REGEX)]],
      complainantGender: [null, Validators.required],
      ageOfSurvivor: [null, [this.nullNotAllowedValidator(), Validators.min(0), Validators.max(120)]],
      complainantBeneficiary: [null, this.nullNotAllowedValidator()],
      complainantBeneficiarySelectionCriteria: [null],
      suspectKnown: [null],
      suspectAssociatedWithProject: [null],
      suspectDetails: ['', [Validators.maxLength(1000)]],
      recommendedReferralServiceId: [null],
      grievanceDescription: ['', [Validators.required, this.trimRequiredValidator(), Validators.maxLength(3000)]],
      grievanceAttachmentUrl: ['', [this.optionalUrlValidator()]],
      grievanceAttachmentFile: [null],
      grievanceAttachmentBytes: [''],
      grievanceAttachmentFilename: [''],
      verbalConsentGranted: [null, this.nullNotAllowedValidator()],
      consentSigned: [null, this.nullNotAllowedValidator()],
      consentFormAttachmentUrl: ['', [this.optionalUrlValidator()]],
      consentFormAttachmentFile: [null],
      consentFormAttachmentBytes: [''],
      consentFormAttachmentFilename: [''],
    });

    this.registerConditionalValidationWatchers();
  }

  // ─── Loaders ────────────────────────────────────────────────────────────────

  loadStates(): void {
    this.lookupService.getOrFetchStateList().then((data: any[]) => {
      this.states = data.map((item) => ({ label: item.name, value: parseInt(item.id, 10) }));
      this.cdr.detectChanges();
    });
  }

  loadGenders(): void {
    const data = this.lookupService.getGenderListbyId();
    this.genders = data.map((item: any) => ({ label: item.name, value: parseInt(item.id, 10) }));
  }

  loadReportingChannels(): void {
    this.apiService.GET('api/grievance/reporting-channel').then((res: any) => {
      const data = res?.data?.content || [];
      this.reportingChannels = data
        .filter((item: any) => item.gbvChannel === true || item.gbvChannel === undefined)
        .map((item: any) => ({ label: item.detail, value: item.id }));
      this.cdr.detectChanges();
    }).catch((err: any) => console.error('Error fetching reporting channels', err));
  }

  // ─── Cascade dropdowns ──────────────────────────────────────────────────────

  onStateChange(event: any): void {
    this.counties = []; this.payams = []; this.bomas = [];
    this.gbvForm.patchValue({ countyId: null, payamId: null, bomaId: null });
    if (event.value) {
      this.lookupService.getCountyListByStateId(event.value.toString()).then((data: any[]) => {
        this.counties = data.map((item) => ({ label: item.name, value: parseInt(item.id, 10) }));
        this.cdr.detectChanges();
      });
    }
  }

  onCountyChange(event: any): void {
    this.payams = []; this.bomas = [];
    this.gbvForm.patchValue({ payamId: null, bomaId: null });
    if (event.value) {
      this.lookupService.getPayamListByCountyId(event.value.toString()).then((data: any[]) => {
        this.payams = data.map((item) => ({ label: item.name, value: parseInt(item.id, 10) }));
        this.cdr.detectChanges();
      });
    }
  }

  onPayamChange(event: any): void {
    this.bomas = [];
    this.gbvForm.patchValue({ bomaId: null });
    if (event.value) {
      this.lookupService.getBomaListByPayamId(event.value.toString()).then((data: any[]) => {
        this.bomas = data.map((item) => ({ label: item.name, value: parseInt(item.id, 10) }));
        this.cdr.detectChanges();
      });
    }
  }

  // ─── File upload ────────────────────────────────────────────────────────────

  onFileUpload(event: any, fileType: 'grievance' | 'consent'): void {
    const file: File | undefined = event.target.files?.[0];
    if (!file) return;

    const ext = file.name?.split('.').pop()?.toLowerCase() ?? '';
    if (!GBVManagement.ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      Swal.fire({ title: 'Invalid File Type', text: `Allowed: ${GBVManagement.ALLOWED_FILE_EXTENSIONS.join(', ')}`, icon: 'warning', confirmButtonColor: '#0d6efd' });
      event.target.value = '';
      return;
    }
    if (file.size > GBVManagement.MAX_FILE_SIZE_BYTES) {
      Swal.fire({ title: 'File Too Large', text: 'Maximum allowed file size is 5 MB.', icon: 'warning', confirmButtonColor: '#0d6efd' });
      event.target.value = '';
      return;
    }

    if (fileType === 'grievance') {
      this.grievanceAttachmentFile = file;
      this.gbvForm.patchValue({ grievanceAttachmentFile: file, grievanceAttachmentFilename: file.name });
    } else {
      this.consentAttachmentFile = file;
      this.gbvForm.patchValue({ consentFormAttachmentFile: file, consentFormAttachmentFilename: file.name });
    }
  }

  // ─── Conditional validators ──────────────────────────────────────────────────

  private registerConditionalValidationWatchers(): void {
    const reportedByCtrl = this.gbvForm.get('incidentReportedBy');
    if (reportedByCtrl) {
      this.subscriptions.push(
        reportedByCtrl.valueChanges.subscribe((val) => this.syncOtherDescValidator(val))
      );
    }
    const channelCtrl = this.gbvForm.get('reportingChannelId');
    if (channelCtrl) {
      this.subscriptions.push(
        channelCtrl.valueChanges.subscribe(() => this.syncChannelOtherValidator())
      );
    }
  }

  private syncOtherDescValidator(reportedByValue: any): void {
    const ctrl = this.gbvForm.get('incidentReportedByOtherDesc');
    if (!ctrl) return;
    if (reportedByValue === 3) {
      ctrl.setValidators([Validators.required, this.trimRequiredValidator(), Validators.maxLength(200)]);
    } else {
      ctrl.setValue('', { emitEvent: false });
      ctrl.setValidators(null);
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private syncChannelOtherValidator(): void {
    const ctrl = this.gbvForm.get('reportingChannelOther');
    if (!ctrl) return;
    if (this.isOtherReportingChannelSelected()) {
      ctrl.setValidators([Validators.required, this.trimRequiredValidator(), Validators.maxLength(200)]);
    } else {
      ctrl.setValue('', { emitEvent: false });
      ctrl.setValidators(null);
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  isIncidentReporterOtherSelected(): boolean {
    return this.gbvForm.get('incidentReportedBy')?.value === 3;
  }

  isOtherReportingChannelSelected(): boolean {
    const id = this.gbvForm.get('reportingChannelId')?.value;
    if (!id || !this.reportingChannels.length) return false;
    const ch = this.reportingChannels.find((c) => c.value === id);
    return ch?.label?.toLowerCase().includes('other') ?? false;
  }

  // ─── Input sanitiser ────────────────────────────────────────────────────────

  onContactNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').slice(0, 15);
    if (sanitized !== input.value) input.value = sanitized;
    this.gbvForm.get('complainantContactNumber')?.setValue(sanitized, { emitEvent: false });
  }

  // ─── Custom validators ───────────────────────────────────────────────────────

  private nullNotAllowedValidator(): ValidatorFn {
    return (ctrl: AbstractControl): ValidationErrors | null =>
      ctrl.value === null || ctrl.value === undefined ? { required: true } : null;
  }

  private trimRequiredValidator(): ValidatorFn {
    return (ctrl: AbstractControl): ValidationErrors | null => {
      if (ctrl.value === null || ctrl.value === undefined) return null;
      if (typeof ctrl.value !== 'string') return null;
      return ctrl.value.trim().length === 0 ? { required: true } : null;
    };
  }

  private optionalPatternValidator(regex: RegExp): ValidatorFn {
    return (ctrl: AbstractControl): ValidationErrors | null => {
      const v = ctrl.value;
      if (!v || (typeof v === 'string' && v.trim() === '')) return null;
      return regex.test(v) ? null : { pattern: { requiredPattern: regex.toString(), actualValue: v } };
    };
  }

  private noFutureDateValidator(): ValidatorFn {
    return (ctrl: AbstractControl): ValidationErrors | null => {
      if (!ctrl.value) return null;
      const d = new Date(ctrl.value);
      if (isNaN(d.getTime())) return { invalidDate: true };
      const eod = new Date();
      eod.setHours(23, 59, 59, 999);
      return d > eod ? { futureDate: true } : null;
    };
  }

  private optionalUrlValidator(): ValidatorFn {
    return (ctrl: AbstractControl): ValidationErrors | null => {
      const v = ctrl.value;
      if (!v || typeof v !== 'string' || !v.trim()) return null;
      try {
        const norm = /^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`;
        return new URL(norm).hostname ? null : { invalidUrl: true };
      } catch {
        return { invalidUrl: true };
      }
    };
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  private trimTextFields(): void {
    const fields = [
      'contactFocalPersonName', 'incidentReportedByOtherDesc', 'reportingChannelOther',
      'complainantContactNumber', 'suspectDetails', 'grievanceDescription',
      'grievanceAttachmentUrl', 'consentFormAttachmentUrl',
    ];
    const patch: Record<string, string> = {};
    fields.forEach((f) => {
      const v = this.gbvForm.get(f)?.value;
      if (typeof v === 'string') patch[f] = v.trim();
    });
    this.gbvForm.patchValue(patch, { emitEvent: false });
  }

  private formatDateForApi(value: Date | string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Appends a plain string/number/boolean field.
   * Never use this for file (MultipartFile) fields.
   */
  private appendValue(fd: FormData, key: string, value: any): void {
    if (value === null || value === undefined) {
      fd.append(key, '');
    } else if (typeof value === 'boolean') {
      fd.append(key, String(value));
    } else {
      fd.append(key, String(value));
    }
  }

  onSubmit(): void {
    this.trimTextFields();

    // Re-sync conditional validators before validity check
    this.syncOtherDescValidator(this.gbvForm.get('incidentReportedBy')?.value);
    this.syncChannelOtherValidator();

    if (this.gbvForm.invalid) {
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
    const v = this.gbvForm.getRawValue();
    const fd = new FormData();

    // ── Non-file fields ──────────────────────────────────────────────────────
    // this.appendValue(fd, 'id', v.id ?? 0);
    this.appendValue(fd, 'trackingNumber', v.trackingNumber || '');
    this.appendValue(fd, 'stateId', v.stateId);
    this.appendValue(fd, 'countyId', v.countyId);
    this.appendValue(fd, 'payamId', v.payamId);
    this.appendValue(fd, 'bomaId', v.bomaId);
    this.appendValue(fd, 'incidentOccurredAt', this.formatDateForApi(v.incidentOccurredAt));
    this.appendValue(fd, 'contactFocalPersonName', v.contactFocalPersonName);
    this.appendValue(fd, 'incidentReportedBy', v.incidentReportedBy);
    this.appendValue(fd, 'incidentReportedByOtherDesc', v.incidentReportedByOtherDesc || '');
    this.appendValue(fd, 'reportingChannelId', v.reportingChannelId);
    this.appendValue(fd, 'reportingChannelOther', v.reportingChannelOther || '');
    this.appendValue(fd, 'complainantContactNumber', v.complainantContactNumber || '');
    this.appendValue(fd, 'complainantGender', v.complainantGender);
    this.appendValue(fd, 'ageOfSurvivor', v.ageOfSurvivor);
    this.appendValue(fd, 'complainantBeneficiary', v.complainantBeneficiary);
    this.appendValue(fd, 'complainantBeneficiarySelectionCriteria', v.complainantBeneficiarySelectionCriteria);
    this.appendValue(fd, 'suspectKnown', v.suspectKnown);
    this.appendValue(fd, 'suspectAssociatedWithProject', v.suspectAssociatedWithProject);
    this.appendValue(fd, 'suspectDetails', v.suspectDetails || '');
    this.appendValue(fd, 'recommendedReferralServiceId', v.recommendedReferralServiceId);
    this.appendValue(fd, 'grievanceDescription', v.grievanceDescription);
    this.appendValue(fd, 'grievanceAttachmentUrl', v.grievanceAttachmentUrl || '');
    this.appendValue(fd, 'grievanceAttachmentBytes', '');
    this.appendValue(fd, 'verbalConsentGranted', v.verbalConsentGranted);
    this.appendValue(fd, 'consentSigned', v.consentSigned);
    this.appendValue(fd, 'consentFormAttachmentUrl', v.consentFormAttachmentUrl || '');
    this.appendValue(fd, 'consentFormAttachmentBytes', '');

    // ── grievanceAttachmentFile — ONLY append when a real File exists ────────
    // DO NOT append an empty string — Spring cannot convert '' to MultipartFile
    if (this.grievanceAttachmentFile) {
      fd.append('grievanceAttachmentFile', this.grievanceAttachmentFile, this.grievanceAttachmentFile.name);
      this.appendValue(fd, 'grievanceAttachmentFilename', this.grievanceAttachmentFile.name);
    } else {
      this.appendValue(fd, 'grievanceAttachmentFilename', '');
      // grievanceAttachmentFile key is intentionally omitted when no file selected
    }

    // ── consentFormAttachmentFile — ONLY append when a real File exists ──────
    // DO NOT append an empty string — Spring cannot convert '' to MultipartFile
    if (this.consentAttachmentFile) {
      fd.append('consentFormAttachmentFile', this.consentAttachmentFile, this.consentAttachmentFile.name);
      this.appendValue(fd, 'consentFormAttachmentFilename', this.consentAttachmentFile.name);
    } else {
      this.appendValue(fd, 'consentFormAttachmentFilename', '');
      // consentFormAttachmentFile key is intentionally omitted when no file selected
    }

    this.apiService
      .POST('api/gbv-grievance/save', fd, 'global', { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res: any) => {
        const result = res?.data;
        if (result?.code === 200) {
          Swal.fire({ title: 'Success!', text: result.message || 'GBV grievance submitted successfully.', icon: 'success', confirmButtonColor: '#0d6efd' });
          this.onReset();
        } else {
          Swal.fire({ title: 'Failed', text: result?.message || 'Failed to submit GBV grievance.', icon: 'error', confirmButtonColor: '#0d6efd' });
        }
      })
      .catch(() => {
        Swal.fire({ title: 'Error!', text: 'An error occurred while submitting the GBV grievance.', icon: 'error', confirmButtonColor: '#0d6efd' });
      })
      .finally(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      });
  }

  onReset(): void {
    this.gbvForm.reset({
      id: 0,
      complainantBeneficiary: null,
      verbalConsentGranted: null,
      consentSigned: null,
    });
    this.syncOtherDescValidator(null);
    this.syncChannelOtherValidator();
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.grievanceAttachmentFile = null;
    this.consentAttachmentFile = null;
    this.cdr.detectChanges();
  }
}