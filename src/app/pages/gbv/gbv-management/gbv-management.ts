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
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-gbv-management',
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
  templateUrl: './gbv-management.html',
  styleUrl: './gbv-management.scss',
})
export class GBVManagement implements OnInit {
  gbvForm!: FormGroup;
  today: Date = new Date();
  isLoading = false;
  isEditMode = false;
  gbvId: number = 0;

  items: MenuItem[] | undefined;
  home: MenuItem | undefined;

  // Dropdown options
  states: any[] = [];
  counties: any[] = [];
  payams: any[] = [];
  bomas: any[] = [];
  reporters = [
    { label: 'Survivor', value: 'Survivor' },
    { label: 'Family Member', value: 'Family Member' },
    { label: 'Other', value: 'Other' },
  ];
  consentOptions = [
    { label: 'Yes', value: 'YES' },
    { label: 'No', value: 'NO' },
  ];

  fileDescription: any = null;
  fileConsent: any = null;

  constructor(
    private fb: FormBuilder,
    private lookupService: LookupService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.home = { icon: 'pi pi-home', routerLink: '/dashboard' };
    this.initForm();
    this.loadStates();

    this.route.params.subscribe((params) => {
      this.gbvId = +params['id'];
      if (this.gbvId) {
        this.isEditMode = true;
        this.items = [{ label: 'Edit GBV Case' }];
        this.loadGBVData();
      } else {
        this.items = [{ label: 'New GBV Case' }];
      }
    });
  }

  initForm(): void {
    this.gbvForm = this.fb.group({
      serialNumber: ['', Validators.required],
      date: [this.today, Validators.required],
      state: [null, Validators.required],
      county: [{ value: null, disabled: true }, Validators.required],
      payam: [{ value: null, disabled: true }, Validators.required],
      boma: [{ value: null, disabled: true }, Validators.required],
      dateOfIncident: [null, Validators.required],
      contactFocalPersonName: ['', Validators.required],
      descriptionOfIncident: ['', Validators.required],
      incidentReportedBy: [null, Validators.required],
      consentSigned: [null, Validators.required],
      fileDescription: [null],
      fileConsent: [null],
    });
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

  loadGBVData(): void {
    this.isLoading = true;
    this.apiService.GET(`api/gbv/details/${this.gbvId}`).then(async (response) => {
      const data = response.data;
      
      // Handle dependent dropdowns first
      if (data.state) {
        await this.loadCounties(data.state);
        if (data.county) {
          await this.loadPayams(data.county);
          if (data.payam) {
            await this.loadBomas(data.payam);
          }
        }
      }

      this.gbvForm.patchValue({
        ...data,
        date: data.date ? new Date(data.date) : null,
        dateOfIncident: data.dateOfIncident ? new Date(data.dateOfIncident) : null,
      });

      this.isLoading = false;
      this.cdr.detectChanges();
    }).catch(error => {
      this.isLoading = false;
      console.error('Error fetching GBV data', error);
    });
  }

  async loadCounties(stateId: any) {
    const data = await this.lookupService.getCountyListByStateId(stateId.toString());
    this.counties = data.map((item) => ({
      label: item.name,
      value: parseInt(item.id),
    }));
    this.gbvForm.get('county')?.enable();
    this.cdr.detectChanges();
  }

  async loadPayams(countyId: any) {
    const data = await this.lookupService.getPayamListByCountyId(countyId.toString());
    this.payams = data.map((item) => ({
      label: item.name,
      value: parseInt(item.id),
    }));
    this.gbvForm.get('payam')?.enable();
    this.cdr.detectChanges();
  }

  async loadBomas(payamId: any) {
    const data = await this.lookupService.getBomaListByPayamId(payamId.toString());
    this.bomas = data.map((item) => ({
      label: item.name,
      value: parseInt(item.id),
    }));
    this.gbvForm.get('boma')?.enable();
    this.cdr.detectChanges();
  }

  onStateChange(event: any): void {
    const stateId = event.value;
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.gbvForm.patchValue({ county: null, payam: null, boma: null });
    this.gbvForm.get('county')?.disable();
    this.gbvForm.get('payam')?.disable();
    this.gbvForm.get('boma')?.disable();

    if (stateId) {
      this.loadCounties(stateId);
    }
  }

  onCountyChange(event: any): void {
    const countyId = event.value;
    this.payams = [];
    this.bomas = [];
    this.gbvForm.patchValue({ payam: null, boma: null });
    this.gbvForm.get('payam')?.disable();
    this.gbvForm.get('boma')?.disable();

    if (countyId) {
      this.loadPayams(countyId);
    }
  }

  onPayamChange(event: any): void {
    const payamId = event.value;
    this.bomas = [];
    this.gbvForm.patchValue({ boma: null });
    this.gbvForm.get('boma')?.disable();

    if (payamId) {
      this.loadBomas(payamId);
    }
  }

  onFileUpload(event: any, fileType: string): void {
    const file = event.target.files[0];
    if (!file) return;

    if (fileType === 'description') {
      this.gbvForm.patchValue({ fileDescription: file });
      this.fileDescription = file;
    } else if (fileType === 'consent') {
      this.gbvForm.patchValue({ fileConsent: file });
      this.fileConsent = file;
    }
  }

  onSubmit(): void {
    if (this.gbvForm.valid) {
      this.isLoading = true;
      const rawValues = this.gbvForm.getRawValue();
      const formData = new FormData();

      Object.keys(rawValues).forEach(key => {
        if (rawValues[key] instanceof Date) {
          formData.append(key, rawValues[key].toISOString().split('T')[0]);
        } else if (rawValues[key] !== null && rawValues[key] !== undefined) {
           if (key !== 'fileDescription' && key !== 'fileConsent') {
             formData.append(key, rawValues[key]);
           }
        }
      });

      if (rawValues.fileDescription) {
        formData.append('descriptionFile', rawValues.fileDescription);
      }
      if (rawValues.fileConsent) {
        formData.append('consentFile', rawValues.fileConsent);
      }

      const endpoint = this.isEditMode ? `api/gbv/update/${this.gbvId}` : 'api/gbv/save';
      
      this.apiService
        .POST(endpoint, formData, 'global', {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((res: any) => {
          const result = res?.data;
          if (result && (result.code === 200 || result.status === 'success')) {
            Swal.fire({
              title: 'Success!',
              text: result.message || 'GBV Case submitted successfully.',
              icon: 'success',
              confirmButtonColor: '#0d6efd',
            });
            this.router.navigate(['/gbv-management/list']);
          } else {
            Swal.fire({
              title: 'Failed',
              text: result?.message || 'Failed to submit GBV case.',
              icon: 'error',
              confirmButtonColor: '#0d6efd',
            });
          }
        })
        .catch((err: any) => {
          console.error('Error saving GBV case', err);
          Swal.fire({
            title: 'Error!',
            text: 'An error occurred while submitting the GBV case.',
            icon: 'error',
            confirmButtonColor: '#0d6efd',
          });
        })
        .finally(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
    } else {
      this.gbvForm.markAllAsTouched();
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields marked with *',
        icon: 'warning',
        confirmButtonColor: '#0d6efd',
      });
    }
  }

  onReset(): void {
    this.gbvForm.reset({
      date: this.today,
    });
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.fileDescription = null;
    this.fileConsent = null;
    this.cdr.detectChanges();
  }

  onCancel(): void {
    this.router.navigate(['/gbv-management/list']);
  }

  onDelete(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this record!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.apiService.DELETE(`api/gbv/delete/${this.gbvId}`).then(() => {
          this.isLoading = false;
          Swal.fire('Deleted!', 'Record has been deleted.', 'success');
          this.router.navigate(['/gbv-management/list']);
        }).catch(error => {
          this.isLoading = false;
          console.error('Error deleting GBV data', error);
          Swal.fire('Error!', 'Failed to delete record.', 'error');
        });
      }
    });
  }
}
