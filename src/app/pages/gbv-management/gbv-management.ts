import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { LookupService, LookupItem } from '../../services/lookup.service';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-gbv-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BreadcrumbModule],
  templateUrl: './gbv-management.html',
  styleUrls: ['./gbv-management.scss']
})
export class GBVManagement implements OnInit {
  gbvForm: FormGroup;
  gbvId: number = 0;
  isEditMode = false;
  isLoading = false;
  states: LookupItem[] = [];
  counties: LookupItem[] = [];
  payams: LookupItem[] = [];
  bomas: LookupItem[] = [];
  fileDescription: any = null;
  fileConsent: any = null;
  reporters = ['Survivor', 'Family Member', 'Other'];
  consentOptions = ['YES', 'NO'];

  items: MenuItem[] | undefined;
  home: MenuItem | undefined;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private lookupService: LookupService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.gbvForm = this.fb.group({
      serialNumber: ['', Validators.required],
      date: ['', Validators.required],
      state: ['', Validators.required],
      county: ['', Validators.required],
      payam: ['', Validators.required],
      boma: ['', Validators.required],
      dateOfIncident: ['', Validators.required],
      contactFocalPersonName: ['', Validators.required],
      descriptionOfIncident: ['', Validators.required],
      incidentReportedBy: ['', Validators.required],
      consentSigned: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.items = [{ label: this.isEditMode ? 'Edit GBV Case' : 'New GBV Case' }];
    this.home = { icon: 'fas fa-home', routerLink: '/dashboard' };

    this.loadStates();
    this.route.params.subscribe(params => {
      this.gbvId = +params['id'];
      if (this.gbvId) {
        this.isEditMode = true;
        this.items = [{ label: 'Edit GBV Case' }];
        this.loadGBVData();
      }
    });
  }

  private loadStates(): void {
    this.lookupService.getOrFetchStateList().then(
      (states) => {
        this.states = states;
        this.cdr.markForCheck();
      }
    ).catch((error) => console.error('Error fetching states', error));
  }

  private loadGBVData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.apiService.GET(`api/gbv/details/${this.gbvId}`).then(response => {
      const data = response.data;
      this.gbvForm.patchValue(data);

      // Load cascading dropdowns if editing
      if (data.state) {
        this.lookupService.getCountyListByStateId(data.state).then(counties => {
          this.counties = counties;
          this.cdr.markForCheck();
          if (data.county) {
            this.lookupService.getPayamListByCountyId(data.county).then(payams => {
              this.payams = payams;
              this.cdr.markForCheck();
              if (data.payam) {
                this.lookupService.getBomaListByPayamId(data.payam).then(bomas => {
                  this.bomas = bomas;
                  this.cdr.markForCheck();
                });
              }
            });
          }
        });
      }

      this.isLoading = false;
      this.cdr.markForCheck();
    }).catch(error => {
      this.isLoading = false;
      this.cdr.markForCheck();
      console.error('Error fetching GBV data', error);
    });
  }

  onStateChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const stateId = target.value;
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.gbvForm.patchValue({ county: '', payam: '', boma: '' });

    if (stateId) {
      this.lookupService.getCountyListByStateId(stateId).then(
        (counties) => {
          this.counties = counties;
          this.cdr.markForCheck();
        }
      ).catch((error) => console.error('Error fetching counties', error));
    }
  }

  onCountyChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const countyId = target.value;
    this.payams = [];
    this.bomas = [];
    this.gbvForm.patchValue({ payam: '', boma: '' });

    if (countyId) {
      this.lookupService.getPayamListByCountyId(countyId).then(
        (payams) => {
          this.payams = payams;
          this.cdr.markForCheck();
        }
      ).catch((error) => console.error('Error fetching payams', error));
    }
  }

  onPayamChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const payamId = target.value;
    this.bomas = [];
    this.gbvForm.patchValue({ boma: '' });

    if (payamId) {
      this.lookupService.getBomaListByPayamId(payamId).then(
        (bomas) => {
          this.bomas = bomas;
          this.cdr.markForCheck();
        }
      ).catch((error) => console.error('Error fetching bomas', error));
    }
  }

  onSave(): void {
    if (this.gbvForm.invalid) {
      this.gbvForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();
    const gbvData = this.gbvForm.value;

    const endpoint = this.isEditMode ? `api/gbv/update/${this.gbvId}` : 'api/gbv/save';
    this.apiService.POST(endpoint, gbvData).then(
      () => {
        this.isLoading = false;
        this.cdr.markForCheck();
        this.router.navigate(['/gbv-list']);
      }
    ).catch((error) => {
      this.isLoading = false;
      this.cdr.markForCheck();
      console.error('Error saving GBV data', error);
    });
  }

  onDelete(): void {
    if (confirm('Are you sure you want to delete this record?')) {
      this.isLoading = true;
      this.cdr.markForCheck();
      this.apiService.DELETE(`api/gbv/delete/${this.gbvId}`).then(
        () => {
          this.isLoading = false;
          this.cdr.markForCheck();
          this.router.navigate(['/gbv-list']);
        }
      ).catch((error) => {
        this.isLoading = false;
        this.cdr.markForCheck();
        console.error('Error deleting GBV data', error);
      });
    }
  }

  onFileUpload(event: Event, fileType: string): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);

    this.apiService.POST('api/gbv/upload', formData).then(
      (response) => {
        if (fileType === 'description') {
          this.fileDescription = response.data;
        } else if (fileType === 'consent') {
          this.fileConsent = response.data;
        }
        this.cdr.markForCheck();
      }
    ).catch((error) => {
      console.error('Error uploading file', error);
    });
  }

  onCancel(): void {
    this.router.navigate(['/gbv-list']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.gbvForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }
}
