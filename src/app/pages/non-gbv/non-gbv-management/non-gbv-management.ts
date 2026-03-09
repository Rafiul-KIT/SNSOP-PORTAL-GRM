import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { FileUploadModule } from 'primeng/fileupload';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { LookupService, LookupItem } from '../../../services/lookup.service';
import { ApiService } from '../../../services/api.service';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-non-gbv-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    FileUploadModule,
    SelectButtonModule,
    ButtonModule,
    InputNumberModule,
    BreadcrumbModule,
  ],
  templateUrl: './non-gbv-management.html',
  styleUrl: './non-gbv-management.scss',
})
export class NonGbvManagement implements OnInit {
  grievanceForm!: FormGroup;
  today: Date = new Date();
  isLoading = false;

  items: MenuItem[] | undefined;
  home: MenuItem | undefined;

  // Dropdown options
  states: any[] = [];
  counties: any[] = [];
  payams: any[] = [];
  bomas: any[] = [];
  reportingChannels: any[] = [];
  genders: any[] = [];
  beneficiaryOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];
  supportTypes = [
    { label: 'LIPW', value: 0 },
    { label: 'DIS', value: 1 },
  ];
  categories: any[] = [];
  grievanceTypes: any[] = [];

  constructor(
    private fb: FormBuilder,
    private lookupService: LookupService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.items = [{ label: 'Non-GBV Management' }];
    this.home = { icon: 'pi pi-home', routerLink: '/dashboard' };
    this.initForm();
    this.loadStates();
    this.loadGenders();
    this.loadReportingChannels();
    this.loadGrievanceCategories();
  }

  loadGrievanceCategories(): void {
    this.apiService
      .GET('api/grievance/type')
      .then((res: any) => {
        const data = res?.data;
        if (data && data.content) {
          this.categories = data.content
            .filter((item: any) => item.status === true)
            .map((item: any) => ({
              label: item.details,
              value: item.id,
            }));
          this.cdr.detectChanges();
        }
      })
      .catch((err) => {
        console.error('Error fetching grievance categories', err);
      });
  }

  isOtherReportingChannelSelected(): boolean {
    const selectedId = this.grievanceForm.get('reportingChannel')?.value;
    if (!selectedId) return false;

    const selected = this.reportingChannels.find((channel) => channel.value === selectedId);
    return selected?.label?.toLowerCase?.().includes('other') ?? false;
  }

  isOtherCategorySelected(): boolean {
    const selectedId = this.grievanceForm.get('categoryOfGrievance')?.value;
    if (!selectedId) return false;
    const selected = this.categories.find((item) => item.value === selectedId);
    return selected?.label?.toLowerCase?.().includes('other') ?? false;
  }

  isOtherTypeSelected(): boolean {
    const selectedId = this.grievanceForm.get('typeOfGrievance')?.value;
    if (!selectedId) return false;
    const selected = this.grievanceTypes.find((item) => item.value === selectedId);
    return selected?.label?.toLowerCase?.().includes('other') ?? false;
  }

  onCategoryChange(event: any): void {
    const categoryId = event.value;
    this.grievanceTypes = [];
    this.grievanceForm.patchValue({ typeOfGrievance: null, typeOfGrievanceOther: '' });

    if (categoryId) {
      if (this.isOtherCategorySelected()) {
        this.grievanceForm.get('typeOfGrievance')?.disable();
        this.grievanceForm.get('typeOfGrievanceOther')?.enable();
      } else {
        this.grievanceForm.get('typeOfGrievance')?.enable();
        this.grievanceForm.get('typeOfGrievanceOther')?.disable();
        
        this.apiService
          .GET(`api/grievance/detail-type`, { type: categoryId })
          .then((res: any) => {
            const data = res?.data;
            if (data && data.content) {
              this.grievanceTypes = data.content
                .filter((item: any) => item.status === true)
                .map((item: any) => ({
                  label: item.details,
                  value: item.id,
                }));
              this.cdr.detectChanges();
            }
          })
          .catch((err) => {
            console.error('Error fetching grievance types', err);
          });
      }
    } else {
      this.grievanceForm.get('typeOfGrievance')?.disable();
      this.grievanceForm.get('typeOfGrievanceOther')?.disable();
    }
    this.cdr.detectChanges();
  }

  onTypeChange(event: any): void {
    this.grievanceForm.patchValue({ typeOfGrievanceOther: '' });
    
    if (this.isOtherTypeSelected()) {
      this.grievanceForm.get('typeOfGrievanceOther')?.enable();
    } else {
      this.grievanceForm.get('typeOfGrievanceOther')?.disable();
    }
    this.cdr.detectChanges();
  }

  loadReportingChannels(): void {
    this.apiService
      .GET('api/grievance/reporting-channel')
      .then((res: any) => {
        const data = res?.data;
        if (data && data.content) {
          this.reportingChannels = data.content
            .filter((item: any) => item.ngbvChannel === true)
            .map((item: any) => ({
              label: item.detail,
              value: item.id,
            }));
          this.cdr.detectChanges();
        }
      })
      .catch((err) => {
        console.error('Error fetching reporting channels', err);
      });
  }

  loadGenders(): void {
    const data = this.lookupService.getGenderListbyId();
    this.genders = data.map((item) => ({
      label: item.name,
      value: parseInt(item.id),
    }));
  }

  initForm(): void {
    this.grievanceForm = this.fb.group({
      serialNumber: [{ value: '', disabled: true }],
      date: [this.today],
      stateName: [null, Validators.required],
      countyName: [null, Validators.required],
      payamName: [null, Validators.required],
      bomaName: [null, Validators.required],
      description: [''],
      attachment: [null],
      reportingChannel: [null, Validators.required],
      otherReportingChannel: [''],
      dateComplaint: [null, Validators.required],
      contactNumber: [''],
      complainantName: ['', Validators.required],
      gender: [null],
      physicalAddress: [''],
      isBeneficiary: [true],
      age: [null],
      supportType: [null],
      categoryOfGrievance: [null, Validators.required],
      typeOfGrievance: [{ value: null, disabled: true }],
      typeOfGrievanceOther: [{ value: '', disabled: true }],
    });
  }

  private formatDateForApi(value: Date | string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadStates(): void {
    this.lookupService.getOrFetchStateList().then((data) => {
      this.states = data.map((item) => ({
        label: item.name,
        value: parseInt(item.id),
      }));
      this.cdr.detectChanges();
    });
  }

  onStateChange(event: any): void {
    const stateId = event.value;
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.grievanceForm.patchValue({
      countyName: null,
      payamName: null,
      bomaName: null,
    });

    if (stateId) {
      this.lookupService
        .getCountyListByStateId(stateId.toString())
        .then((data) => {
          this.counties = data.map((item) => ({
            label: item.name,
            value: parseInt(item.id),
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
    this.grievanceForm.patchValue({ payamName: null, bomaName: null });

    if (countyId) {
      this.lookupService
        .getPayamListByCountyId(countyId.toString())
        .then((data) => {
          this.payams = data.map((item) => ({
            label: item.name,
            value: parseInt(item.id),
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
    this.grievanceForm.patchValue({ bomaName: null });

    if (payamId) {
      this.lookupService
        .getBomaListByPayamId(payamId.toString())
        .then((data) => {
          this.bomas = data.map((item) => ({
            label: item.name,
            value: parseInt(item.id),
          }));
          this.cdr.detectChanges();
        });
    } else {
      this.cdr.detectChanges();
    }
  }

  onSubmit(): void {
    if (this.grievanceForm.valid) {
      this.isLoading = true;
      const rawValues = this.grievanceForm.getRawValue();

      const formData = new FormData();
      formData.append('id', '0');
      formData.append('trackingNumber', '');
      formData.append('stateId', rawValues.stateName);
      formData.append('countyId', rawValues.countyName);
      formData.append('payamId', rawValues.payamName);
      formData.append('bomaId', rawValues.bomaName);

      const incidentDate = this.formatDateForApi(rawValues.dateComplaint);
      formData.append('incidentOccurredAt', incidentDate);

      formData.append('reportingChannelId', rawValues.reportingChannel);
      formData.append(
        'reportingChannelOther',
        rawValues.otherReportingChannel || ''
      );
      formData.append('complainantName', rawValues.complainantName);
      formData.append('complainantContact', rawValues.contactNumber || '');
      formData.append(
        'complainantPhysicalAddress',
        rawValues.physicalAddress || ''
      );
      formData.append(
        'complainantGender',
        rawValues.gender !== null ? rawValues.gender : ''
      );
      formData.append(
        'complainantAge',
        rawValues.age !== null ? rawValues.age : ''
      );
      formData.append('complainantBeneficiary', rawValues.isBeneficiary);
      formData.append(
        'complainantBeneficiarySelectionCriteria',
        rawValues.supportType !== null ? rawValues.supportType : ''
      );
      formData.append('grievanceTypeId', rawValues.categoryOfGrievance);
      formData.append('grievanceDetailTypeId', rawValues.typeOfGrievance || '');
      formData.append(
        'grievanceTypeOtherDesc',
        rawValues.typeOfGrievanceOther || ''
      );
      formData.append('grievanceDescription', rawValues.description || '');
      formData.append('grievanceAttachmentUrl', '');
      formData.append('grievanceAttachmentBytes', '');

      if (rawValues.attachment) {
        formData.append('grievanceAttachmentFile', rawValues.attachment);
        formData.append(
          'grievanceAttachmentFilename',
          rawValues.attachment.name
        );
      } else {
        formData.append('grievanceAttachmentFilename', '');
      }

      this.apiService
        .POST('api/ngbv-grievance/save', formData, 'global', {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((res: any) => {
          const result = res?.data;
          if (result && result.code === 200) {
            Swal.fire({
              title: 'Success!',
              text: result.message || 'Grievance submitted successfully.',
              icon: 'success',
              confirmButtonColor: '#0d6efd',
            });
            this.onReset();
          } else {
            Swal.fire({
              title: 'Failed',
              text: result?.message || 'Failed to submit grievance.',
              icon: 'error',
              confirmButtonColor: '#0d6efd',
            });
          }
        })
        .catch((err: any) => {
          console.error('Error saving grievance', err);
          Swal.fire({
            title: 'Error!',
            text: 'An error occurred while submitting the grievance.',
            icon: 'error',
            confirmButtonColor: '#0d6efd',
          });
        })
        .finally(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
    } else {
      Object.keys(this.grievanceForm.controls).forEach((key) => {
        const control = this.grievanceForm.get(key);
        control?.markAsTouched();
      });
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields marked with *',
        icon: 'warning',
        confirmButtonColor: '#0d6efd',
      });
    }
  }

  onReset(): void {
    this.grievanceForm.reset({
      date: this.today,
      isBeneficiary: true,
      categoryOfGrievance: null,
    });
    this.grievanceForm.get('typeOfGrievance')?.disable();
    this.grievanceForm.get('typeOfGrievanceOther')?.disable();
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.grievanceTypes = [];
    this.cdr.detectChanges();
  }

  onFileSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.grievanceForm.patchValue({
        attachment: file,
      });
    }
  }
}
