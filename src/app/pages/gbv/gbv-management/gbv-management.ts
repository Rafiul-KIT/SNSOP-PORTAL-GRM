import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
export class GBVManagement implements OnInit {
  gbvForm!: FormGroup;
  today: Date = new Date();
  isLoading = false;

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

  initForm(): void {
    this.gbvForm = this.fb.group({
      id: "",
      trackingNumber: [{ value: '', disabled: true }],
      stateId: [null, Validators.required],
      countyId: [null, Validators.required],
      payamId: [null, Validators.required],
      bomaId: [null, Validators.required],
      incidentOccurredAt: [null, Validators.required],
      contactFocalPersonName: ['', Validators.required],
      incidentReportedBy: [null],
      incidentReportedByOtherDesc: [''],
      reportingChannelId: [null, Validators.required],
      reportingChannelOther: [''],
      complainantContactNumber: [''],
      complainantGender: [null, Validators.required],
      ageOfSurvivor: [null, [Validators.required, Validators.min(0)]],
      complainantBeneficiary: [true],
      complainantBeneficiarySelectionCriteria: [null],
      suspectKnown: [null],
      suspectAssociatedWithProject: [null],
      suspectDetails: [''],
      recommendedReferralServiceId: [null],
      grievanceDescription: ['', Validators.required],
      grievanceAttachmentUrl: [''],
      grievanceAttachmentFile: [null],
      grievanceAttachmentBytes: [''],
      grievanceAttachmentFilename: [''],
      verbalConsentGranted: [null],
      consentSigned: [null],
      consentFormAttachmentUrl: [''],
      consentFormAttachmentFile: [null],
      consentFormAttachmentBytes: [''],
      consentFormAttachmentFilename: [''],
    });
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
    if (!this.gbvForm.valid) {
      this.gbvForm.markAllAsTouched();
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields marked with *',
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
      complainantBeneficiary: true,
    });

    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.grievanceAttachmentFile = null;
    this.consentAttachmentFile = null;
    this.cdr.detectChanges();
  }
}
