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
import { RadioButtonModule } from 'primeng/radiobutton';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { LookupService } from '../../../services/lookup.service';
import { ApiService } from '../../../services/api.service';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import Swal from 'sweetalert2';
import { validateFile } from '../../../utils/file-validation.util';

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
    RadioButtonModule,
    ButtonModule,
    InputNumberModule,
    DialogModule,
    BreadcrumbModule,
  ],
  templateUrl: './gbv-management.html',
  styleUrls: ['./gbv-management.scss'],
})
export class GBVManagement implements OnInit, OnDestroy {
  private static readonly PHONE_REGEX = /^[0-9]{1,10}$/;

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

  selectionCriteriaOptions = [
    { label: 'LIPW', value: 0 },
    { label: 'DIS', value: 1 },
  ];

  referralServices = [
    { label: 'GBV Case Management', value: 1 },
    { label: 'Protection Services', value: 2 },
    { label: 'Medical Services', value: 3 },
    { label: 'Psychosocial Services', value: 4 },
    { label: 'Legal Assistances', value: 5 },
    { label: 'Safe Space', value: 6 },
    { label: 'Other', value: 7 },
  ];

  grievanceAttachmentFile: File | null = null;
  consentAttachmentFile: File | null = null;
  displaySavedIssueDialog = false;
  savedIssueSummary: { label: string; value: string }[] = [];

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
      date: [{ value: this.today, disabled: true }],

      stateId: [null, Validators.required],
      countyId: [{ value: null, disabled: true }, Validators.required],
      payamId: [{ value: null, disabled: true }, Validators.required],
      bomaId: [{ value: null, disabled: true }, Validators.required],
      incidentOccurredAt: [null, [Validators.required, this.noFutureDateValidator()]],

      contactFocalPersonName: ['', [Validators.required, this.trimRequiredValidator(), Validators.maxLength(120), Validators.pattern(/^[A-Za-z\s]+$/)]],
      incidentReportedBy: [null],
      // NO validators — syncOtherDescValidator manages them
      incidentReportedByOtherDesc: [''],
      reportingChannelId: [null, Validators.required],
      // NO validators — syncChannelOtherValidator manages them
      reportingChannelOther: [''],

      complainantContactNumber: [
        '',
        [
          Validators.required,
          this.trimRequiredValidator(),
          Validators.maxLength(10),
          this.optionalPatternValidator(GBVManagement.PHONE_REGEX),
        ],
      ],
      complainantGender: [null, Validators.required],
      ageOfSurvivor: [null, [this.nullNotAllowedValidator(), Validators.min(0), Validators.max(120)]],
      complainantBeneficiary: [null, this.nullNotAllowedValidator()],
      complainantBeneficiarySelectionCriteria: [null],
      suspectKnown: [null],
      suspectAssociatedWithProject: [null],
      suspectDetails: [{ value: '', disabled: true }, [Validators.maxLength(1000)]],
      recommendedReferralServiceId: [null],
      availableInfoSuspectedPerpetrator: [{ value: '', disabled: true }, [Validators.maxLength(1000)]],
      referralServicesRecommendedDetails: [{ value: '', disabled: true }, [Validators.maxLength(1000)]],
      statusAfterReferral: ['', [Validators.maxLength(500)]],
      grievanceDescription: ['', [Validators.required, this.trimRequiredValidator(), Validators.maxLength(3000)]],
      grievanceAttachmentUrl: ['', [this.optionalUrlValidator()]],
      grievanceAttachmentFile: [null, Validators.required],
      grievanceAttachmentBytes: [''],
      grievanceAttachmentFilename: [''],
      verbalConsentGranted: [null, this.nullNotAllowedValidator()],
      consentSigned: [null, this.nullNotAllowedValidator()],
      consentFormAttachmentUrl: ['', [this.optionalUrlValidator()]],
      consentFormAttachmentFile: [null, Validators.required],
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
    this.gbvForm.get('payamId')?.disable({ emitEvent: false });
    this.gbvForm.get('bomaId')?.disable({ emitEvent: false });
    if (event.value) {
      this.gbvForm.get('countyId')?.enable({ emitEvent: false });
      this.lookupService.getCountyListByStateId(event.value.toString()).then((data: any[]) => {
        this.counties = data.map((item) => ({ label: item.name, value: parseInt(item.id, 10) }));
        this.cdr.detectChanges();
      });
    } else {
      this.gbvForm.get('countyId')?.disable({ emitEvent: false });
    }
  }

  onCountyChange(event: any): void {
    this.payams = []; this.bomas = [];
    this.gbvForm.patchValue({ payamId: null, bomaId: null });
    this.gbvForm.get('bomaId')?.disable({ emitEvent: false });
    if (event.value) {
      this.gbvForm.get('payamId')?.enable({ emitEvent: false });
      this.lookupService.getPayamListByCountyId(event.value.toString()).then((data: any[]) => {
        this.payams = data.map((item) => ({ label: item.name, value: parseInt(item.id, 10) }));
        this.cdr.detectChanges();
      });
    } else {
      this.gbvForm.get('payamId')?.disable({ emitEvent: false });
    }
  }

  onPayamChange(event: any): void {
    this.bomas = [];
    this.gbvForm.patchValue({ bomaId: null });
    if (event.value) {
      this.gbvForm.get('bomaId')?.enable({ emitEvent: false });
      this.lookupService.getBomaListByPayamId(event.value.toString()).then((data: any[]) => {
        this.bomas = data.map((item) => ({ label: item.name, value: parseInt(item.id, 10) }));
        this.cdr.detectChanges();
      });
    } else {
      this.gbvForm.get('bomaId')?.disable({ emitEvent: false });
    }
  }

  // ─── File upload ────────────────────────────────────────────────────────────

  onFileUpload(event: any, fileType: 'grievance' | 'consent'): void {
    const file = validateFile(event);
    if (!file) return;

    if (fileType === 'grievance') {
      this.grievanceAttachmentFile = file;
      this.gbvForm.patchValue({ grievanceAttachmentFile: file, grievanceAttachmentFilename: file.name });
    } else {
      this.consentAttachmentFile = file;
      this.gbvForm.patchValue({ consentFormAttachmentFile: file, consentFormAttachmentFilename: file.name });
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] || '';
      if (fileType === 'grievance') {
        this.gbvForm.patchValue({ grievanceAttachmentBytes: base64 });
      } else {
        this.gbvForm.patchValue({ consentFormAttachmentBytes: base64 });
      }
    };
    reader.readAsDataURL(file);
  }

  onViewFile(fileType: 'grievance' | 'consent'): void {
    const file = fileType === 'grievance' ? this.grievanceAttachmentFile : this.consentAttachmentFile;
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  onRemoveFile(fileType: 'grievance' | 'consent'): void {
    if (fileType === 'grievance') {
      this.grievanceAttachmentFile = null;
      this.gbvForm.patchValue({ grievanceAttachmentFile: null, grievanceAttachmentFilename: '', grievanceAttachmentBytes: '' });
      this.gbvForm.get('grievanceAttachmentFile')?.markAsTouched();
    } else {
      this.consentAttachmentFile = null;
      this.gbvForm.patchValue({ consentFormAttachmentFile: null, consentFormAttachmentFilename: '', consentFormAttachmentBytes: '' });
      this.gbvForm.get('consentFormAttachmentFile')?.markAsTouched();
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
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
    const complainantBeneficiaryCtrl = this.gbvForm.get('complainantBeneficiary');
    if (complainantBeneficiaryCtrl) {
      this.subscriptions.push(
        complainantBeneficiaryCtrl.valueChanges.subscribe((val) => this.syncBeneficiarySelectionCriteriaValidator(val))
      );
      this.syncBeneficiarySelectionCriteriaValidator(complainantBeneficiaryCtrl.value);
    }

    // Suspect Known → enable/disable Suspect Details
    const suspectKnownCtrl = this.gbvForm.get('suspectKnown');
    if (suspectKnownCtrl) {
      this.subscriptions.push(
        suspectKnownCtrl.valueChanges.subscribe((val) => this.syncSuspectDetails(val))
      );
    }

    // Suspect Associated With Project → enable/disable Available Info on Suspected Perpetrator
    const suspectAssociatedCtrl = this.gbvForm.get('suspectAssociatedWithProject');
    if (suspectAssociatedCtrl) {
      this.subscriptions.push(
        suspectAssociatedCtrl.valueChanges.subscribe((val) => this.syncAvailableInfoPerpetrator(val))
      );
    }

    // Recommended Referral Service → enable/disable Referral Services Recommended Details when "Other" (7)
    const referralServiceCtrl = this.gbvForm.get('recommendedReferralServiceId');
    if (referralServiceCtrl) {
      this.subscriptions.push(
        referralServiceCtrl.valueChanges.subscribe((val) => this.syncReferralDetails(val))
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

  private syncBeneficiarySelectionCriteriaValidator(beneficiaryValue: any): void {
    const ctrl = this.gbvForm.get('complainantBeneficiarySelectionCriteria');
    if (!ctrl) return;
    if (beneficiaryValue === true) {
      ctrl.setValidators([this.nullNotAllowedValidator()]);
    } else {
      ctrl.setValue(null, { emitEvent: false });
      ctrl.setValidators(null);
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private syncSuspectDetails(suspectKnown: any): void {
    const ctrl = this.gbvForm.get('suspectDetails');
    if (!ctrl) return;
    if (suspectKnown === true) {
      ctrl.enable({ emitEvent: false });
    } else {
      ctrl.setValue('', { emitEvent: false });
      ctrl.disable({ emitEvent: false });
    }
  }

  private syncAvailableInfoPerpetrator(suspectAssociated: any): void {
    const ctrl = this.gbvForm.get('availableInfoSuspectedPerpetrator');
    if (!ctrl) return;
    if (suspectAssociated === true) {
      ctrl.enable({ emitEvent: false });
    } else {
      ctrl.setValue('', { emitEvent: false });
      ctrl.disable({ emitEvent: false });
    }
  }

  private syncReferralDetails(referralServiceId: any): void {
    const ctrl = this.gbvForm.get('referralServicesRecommendedDetails');
    if (!ctrl) return;
    if (referralServiceId === 7) {
      ctrl.enable({ emitEvent: false });
    } else {
      ctrl.setValue('', { emitEvent: false });
      ctrl.disable({ emitEvent: false });
    }
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

  isComplainantBeneficiarySelected(): boolean {
    return this.gbvForm.get('complainantBeneficiary')?.value === true;
  }

  // ─── Input sanitiser ────────────────────────────────────────────────────────

  onContactNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.replace(/\D/g, '').slice(0, 10);
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
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return d >= todayStart ? { futureDate: true } : null;
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
      'complainantContactNumber', 'suspectDetails', 'availableInfoSuspectedPerpetrator',
      'referralServicesRecommendedDetails', 'statusAfterReferral', 'grievanceDescription',
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
    if (value === null || value === undefined) return;
    fd.append(key, String(value));
  }

  onSubmit(): void {
    this.trimTextFields();

    // Re-sync conditional validators before validity check
    this.syncOtherDescValidator(this.gbvForm.get('incidentReportedBy')?.value);
    this.syncChannelOtherValidator();
    this.syncBeneficiarySelectionCriteriaValidator(this.gbvForm.get('complainantBeneficiary')?.value);

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

    // ── Required fields ────────────────────────────────────────────────────
    // this.appendValue(fd, 'id', v.id ?? 0);
    this.appendValue(fd, 'stateId', v.stateId);
    this.appendValue(fd, 'countyId', v.countyId);
    this.appendValue(fd, 'payamId', v.payamId);
    this.appendValue(fd, 'bomaId', v.bomaId);
    this.appendValue(fd, 'incidentOccurredAt', this.formatDateForApi(v.incidentOccurredAt));
    this.appendValue(fd, 'contactFocalPersonName', v.contactFocalPersonName);
    this.appendValue(fd, 'reportingChannelId', v.reportingChannelId);
    this.appendValue(fd, 'complainantGender', v.complainantGender);
    this.appendValue(fd, 'ageOfSurvivor', v.ageOfSurvivor);
    this.appendValue(fd, 'complainantBeneficiary', v.complainantBeneficiary);
    this.appendValue(fd, 'grievanceDescription', v.grievanceDescription);

    // ── Optional fields (only append when user provided a value) ─────────
    this.appendValue(fd, 'trackingNumber', v.trackingNumber);
    this.appendValue(fd, 'incidentReportedBy', v.incidentReportedBy);
    this.appendValue(fd, 'incidentReportedByOtherDesc', v.incidentReportedByOtherDesc?.trim() || null);
    this.appendValue(fd, 'reportingChannelOther', v.reportingChannelOther?.trim() || null);
    this.appendValue(fd, 'complainantContactNumber', v.complainantContactNumber?.trim() || null);
    this.appendValue(fd, 'complainantBeneficiarySelectionCriteria', v.complainantBeneficiarySelectionCriteria);
    this.appendValue(fd, 'suspectKnown', v.suspectKnown);
    this.appendValue(fd, 'suspectAssociatedWithProject', v.suspectAssociatedWithProject);
    this.appendValue(fd, 'suspectDetails', v.suspectDetails?.trim() || null);
    this.appendValue(fd, 'recommendedReferralServiceId', v.recommendedReferralServiceId != null ? String(Math.round(v.recommendedReferralServiceId)) : null);
    this.appendValue(fd, 'availableInfoSuspectedPerpetrator', v.availableInfoSuspectedPerpetrator?.trim() || null);
    this.appendValue(fd, 'referralServicesRecommendedDetails', v.referralServicesRecommendedDetails?.trim() || null);
    this.appendValue(fd, 'statusAfterReferral', v.statusAfterReferral?.trim() || null);
    this.appendValue(fd, 'grievanceAttachmentUrl', v.grievanceAttachmentUrl?.trim() || null);
    this.appendValue(fd, 'verbalConsentGranted', v.verbalConsentGranted);
    this.appendValue(fd, 'consentSigned', v.consentSigned);
    this.appendValue(fd, 'consentFormAttachmentUrl', v.consentFormAttachmentUrl?.trim() || null);

    // ── grievanceAttachmentFile — ONLY append when a real File exists ────────
    // DO NOT append an empty string — Spring cannot convert '' to MultipartFile
    if (this.grievanceAttachmentFile) {
      fd.append('grievanceAttachmentFile', this.grievanceAttachmentFile, this.grievanceAttachmentFile.name);
      this.appendValue(fd, 'grievanceAttachmentFilename', this.grievanceAttachmentFile.name);
      this.appendValue(fd, 'grievanceAttachmentBytes', v.grievanceAttachmentBytes || '');
    } else {
      this.appendValue(fd, 'grievanceAttachmentFilename', '');
      this.appendValue(fd, 'grievanceAttachmentBytes', '');
      // grievanceAttachmentFile key is intentionally omitted when no file selected
    }

    // ── consentFormAttachmentFile — ONLY append when a real File exists ──────
    // DO NOT append an empty string — Spring cannot convert '' to MultipartFile
    if (this.consentAttachmentFile) {
      fd.append('consentFormAttachmentFile', this.consentAttachmentFile, this.consentAttachmentFile.name);
      this.appendValue(fd, 'consentFormAttachmentFilename', this.consentAttachmentFile.name);
      this.appendValue(fd, 'consentFormAttachmentBytes', v.consentFormAttachmentBytes || '');
    } else {
      this.appendValue(fd, 'consentFormAttachmentFilename', '');
      this.appendValue(fd, 'consentFormAttachmentBytes', '');
      // consentFormAttachmentFile key is intentionally omitted when no file selected
    }

    this.apiService
      .POST('api/gbv-grievance/save', fd, 'global', { headers: { 'Content-Type': undefined } })
      .then((res: any) => {
        const result = res?.data;
        if (result?.code === 200) {
          this.savedIssueSummary = this.buildSavedIssueSummary(v, result);
          this.displaySavedIssueDialog = true;
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

  private buildSavedIssueSummary(formValue: any, result: any): { label: string; value: string }[] {
    const content = result?.content || result?.data || {};
    const trackingNumberFromMessage = this.extractTrackingNumber(result?.message);
    const trackingNumber = content?.trackingNumber || trackingNumberFromMessage || formValue?.trackingNumber || '--';
    const incidentDate = this.formatDateForApi(formValue?.incidentOccurredAt) || '--';

    return [
      { label: 'Tracking Number', value: this.toDisplayValue(trackingNumber) },
      { label: 'Incident Occurred Date', value: this.toDisplayValue(incidentDate) },
      { label: 'State', value: this.findOptionLabel(this.states, formValue?.stateId) },
      { label: 'County', value: this.findOptionLabel(this.counties, formValue?.countyId) },
      { label: 'Payam', value: this.findOptionLabel(this.payams, formValue?.payamId) },
      { label: 'Boma', value: this.findOptionLabel(this.bomas, formValue?.bomaId) },
      { label: 'Contact Focal Person', value: this.toDisplayValue(formValue?.contactFocalPersonName) },
      { label: 'Incident Reported By', value: this.isIncidentReporterOtherSelected() && formValue?.incidentReportedByOtherDesc
        ? `${this.findOptionLabel(this.incidentReporters, formValue?.incidentReportedBy)} (${formValue.incidentReportedByOtherDesc})`
        : this.findOptionLabel(this.incidentReporters, formValue?.incidentReportedBy) },
      { label: 'Reporting Channel', value: this.isOtherReportingChannelSelected() && formValue?.reportingChannelOther
        ? `${this.findOptionLabel(this.reportingChannels, formValue?.reportingChannelId)} (${formValue.reportingChannelOther})`
        : this.findOptionLabel(this.reportingChannels, formValue?.reportingChannelId) },
      { label: 'Complainant Gender', value: this.findOptionLabel(this.genders, formValue?.complainantGender) },
      { label: 'Age of Survivor', value: this.toDisplayValue(formValue?.ageOfSurvivor) },
      { label: 'Complainant Beneficiary', value: this.booleanLabel(formValue?.complainantBeneficiary) },
      { label: 'Verbal Consent Granted', value: this.booleanLabel(formValue?.verbalConsentGranted) },
      { label: 'Consent Signed', value: this.booleanLabel(formValue?.consentSigned) },
      { label: 'Grievance Description', value: this.toDisplayValue(formValue?.grievanceDescription) },
      { label: 'Grievance Attachment', value: this.toDisplayValue(this.grievanceAttachmentFile?.name) },
      { label: 'Consent Attachment', value: this.toDisplayValue(this.consentAttachmentFile?.name) },
      // { label: 'Note', value: this.toDisplayValue(result?.message) },
    ];
  }

  private extractTrackingNumber(message: any): string | null {
    if (typeof message !== 'string' || !message.trim()) return null;
    const match = message.match(/Tracking\s*(?:No|Number)\s*:\s*([A-Za-z0-9-]+)/i);
    return match?.[1]?.trim() || null;
  }

  private findOptionLabel(options: any[], value: any): string {
    const found = options?.find((item: any) => item?.value === value);
    return this.toDisplayValue(found?.label);
  }

  private booleanLabel(value: any): string {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return '--';
  }

  private toDisplayValue(value: any): string {
    if (value === null || value === undefined) return '--';
    const text = String(value).trim();
    return text.length ? text : '--';
  }

  private escapePdfText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private wrapPdfText(text: string, maxCharsPerLine: number): string[] {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return ['--'];

    const words = normalized.split(' ');
    const lines: string[] = [];
    let current = '';

    words.forEach((word) => {
      if (word.length > maxCharsPerLine) {
        if (current) {
          lines.push(current);
          current = '';
        }
        let start = 0;
        while (start < word.length) {
          lines.push(word.slice(start, start + maxCharsPerLine));
          start += maxCharsPerLine;
        }
        return;
      }

      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxCharsPerLine) {
        current = next;
      } else {
        lines.push(current);
        current = word;
      }
    });

    if (current) lines.push(current);
    return lines.length ? lines : ['--'];
  }

  private pdfTextCommand(
    x: number,
    y: number,
    text: string,
    fontKey: 'F1' | 'F2',
    fontSize: number,
    rgb: [number, number, number] = [0, 0, 0]
  ): string {
    return `BT /${fontKey} ${fontSize} Tf ${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x} ${y} Td (${this.escapePdfText(text)}) Tj ET`;
  }

  downloadSavedIssuePdf(): void {
    if (!this.savedIssueSummary.length) return;
    const trackingNumber = this.toDisplayValue(
      this.savedIssueSummary.find((row) => row.label === 'Tracking Number')?.value
    );
    const safeTrackingNumber = trackingNumber !== '--'
      ? trackingNumber.replace(/[^A-Za-z0-9-_]/g, '')
      : 'NA';

    const pageWidth = 595;
    const pageHeight = 842;
    const marginX = 40;
    const marginBottom = 36;
    const tableStartYFirstPage = 710;
    const tableStartYOtherPages = 770;
    const contentWidth = pageWidth - (marginX * 2);
    const labelColWidth = 180;
    const valueColWidth = contentWidth - labelColWidth;
    const rowPadding = 6;
    const rowLineHeight = 11;
    const maxLabelChars = 34;
    const maxValueChars = 58;

    const formatGeneratedAt = (): string => {
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      return `${date} ${time}`;
    };

    const pages: string[][] = [];
    let activePageIndex = -1;
    let y = 0;

    const startNewPage = (isFirstPage: boolean): void => {
      pages.push([]);
      activePageIndex += 1;
      const cmds = pages[activePageIndex];

      cmds.push('q 0.08 0.37 0.75 rg 0 790 595 52 re f Q');
      cmds.push(this.pdfTextCommand(42, 820, isFirstPage ? 'GBV Management Issue Summary' : 'GBV Management Issue Summary (Continued)', 'F2', 16, [1, 1, 1]));
      cmds.push(this.pdfTextCommand(42, 798, `Generated At: ${formatGeneratedAt()}`, 'F1', 10, [1, 1, 1]));

      cmds.push('q 0.95 0.95 0.95 rg 40 758 515 22 re f Q');
      cmds.push('q 0.82 0.84 0.88 RG 1 w 40 758 515 22 re S Q');
      cmds.push(this.pdfTextCommand(46, 764, 'Case Snapshot', 'F2', 10, [0.2, 0.2, 0.2]));
      cmds.push(this.pdfTextCommand(180, 764, this.toDisplayValue(this.savedIssueSummary.find((s) => s.label === 'Tracking Number')?.value), 'F1', 10, [0.2, 0.2, 0.2]));

      const tableHeaderY = isFirstPage ? 730 : 790;
      cmds.push('q 0.16 0.24 0.36 rg 40 ' + (tableHeaderY - 2) + ' 515 22 re f Q');
      cmds.push(this.pdfTextCommand(46, tableHeaderY + 5, 'Field', 'F2', 10, [1, 1, 1]));
      cmds.push(this.pdfTextCommand(226, tableHeaderY + 5, 'Value', 'F2', 10, [1, 1, 1]));
      y = isFirstPage ? tableStartYFirstPage : tableStartYOtherPages;
    };

    startNewPage(true);

    this.savedIssueSummary.forEach((row, index) => {
      const labelLines = this.wrapPdfText(this.toDisplayValue(row.label), maxLabelChars);
      const valueLines = this.wrapPdfText(this.toDisplayValue(row.value), maxValueChars);
      const textLineCount = Math.max(labelLines.length, valueLines.length);
      const rowHeight = rowPadding + (textLineCount * rowLineHeight) + rowPadding;

      if (y - rowHeight < marginBottom) {
        startNewPage(false);
      }

      const rowY = y - rowHeight;
      const cmds = pages[activePageIndex];

      if (index % 2 === 0) {
        cmds.push(`q 0.975 0.98 0.99 rg ${marginX} ${rowY} ${contentWidth} ${rowHeight} re f Q`);
      }
      cmds.push(`q 0.86 0.88 0.9 RG 1 w ${marginX} ${rowY} ${contentWidth} ${rowHeight} re S Q`);
      cmds.push(`q 0.9 0.9 0.9 RG 1 w ${marginX + labelColWidth} ${rowY} m ${marginX + labelColWidth} ${rowY + rowHeight} l S Q`);

      labelLines.forEach((line, i) => {
        cmds.push(this.pdfTextCommand(marginX + 6, y - rowPadding - ((i + 1) * rowLineHeight) + 2, line, 'F2', 9));
      });
      valueLines.forEach((line, i) => {
        cmds.push(this.pdfTextCommand(marginX + labelColWidth + 6, y - rowPadding - ((i + 1) * rowLineHeight) + 2, line, 'F1', 9));
      });

      y -= rowHeight;
    });

    const totalPages = pages.length;
    pages.forEach((cmds, idx) => {
      cmds.push('q 0.8 0.8 0.8 RG 1 w 40 26 m 555 26 l S Q');
      cmds.push(this.pdfTextCommand(42, 14, 'Generated by GBV Management Portal', 'F1', 9, [0.38, 0.38, 0.38]));
      cmds.push(this.pdfTextCommand(500, 14, `Page ${idx + 1} of ${totalPages}`, 'F1', 9, [0.38, 0.38, 0.38]));
    });

    const streams = pages.map((cmds) => cmds.join('\n'));
    const pageIds: number[] = [];
    const contentIds: number[] = [];
    let nextObjectId = 5;
    streams.forEach(() => {
      contentIds.push(nextObjectId);
      nextObjectId += 1;
      pageIds.push(nextObjectId);
      nextObjectId += 1;
    });

    const lastObjectId = nextObjectId - 1;
    const objectMap = new Map<number, string>();
    objectMap.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
    objectMap.set(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
    objectMap.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    objectMap.set(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    streams.forEach((stream, i) => {
      const contentId = contentIds[i];
      const pageId = pageIds[i];
      objectMap.set(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      objectMap.set(
        pageId,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
      );
    });

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (let id = 1; id <= lastObjectId; id += 1) {
      const body = objectMap.get(id) || '';
      offsets[id] = pdf.length;
      pdf += `${id} 0 obj\n${body}\nendobj\n`;
    }

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${lastObjectId + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let id = 1; id <= lastObjectId; id += 1) {
      pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${lastObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gbv-${safeTrackingNumber}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  onReset(): void {
    this.gbvForm.reset({
      id: 0,
      date: { value: this.today, disabled: true },
      incidentOccurredAt: null,
      complainantBeneficiary: null,
      verbalConsentGranted: null,
      consentSigned: null,
    });
    this.syncOtherDescValidator(null);
    this.syncChannelOtherValidator();
    this.syncBeneficiarySelectionCriteriaValidator(null);
    this.syncSuspectDetails(null);
    this.syncAvailableInfoPerpetrator(null);
    this.syncReferralDetails(null);
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.gbvForm.get('countyId')?.disable({ emitEvent: false });
    this.gbvForm.get('payamId')?.disable({ emitEvent: false });
    this.gbvForm.get('bomaId')?.disable({ emitEvent: false });
    this.grievanceAttachmentFile = null;
    this.consentAttachmentFile = null;
    this.cdr.detectChanges();
  }
}
