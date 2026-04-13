import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputGroupModule } from 'primeng/inputgroup';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import Swal from 'sweetalert2';
import { Loader } from '../../../components/loader/loader';
import { ItSupportService, ITCategory, ITModule } from '../../../services/it-support.service';

@Component({
  selector: 'app-help-desk-submit-request',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, BreadcrumbModule, ButtonModule,
    SelectModule, InputTextModule, TextareaModule, FloatLabelModule,
    InputGroupModule, ProgressSpinnerModule, Loader
  ],
  templateUrl: './help-desk-submit-request.html',
  styleUrls: ['./help-desk-submit-request.scss']
})
export class HelpDeskSubmitRequest implements OnInit {
  breadcrumbHome = { icon: 'fas fa-home', routerLink: '/' };
  breadcrumbItems = [{ label: 'Help Desk' }, { label: 'Submit Support Request' }];

  requestForm: FormGroup;
  selectedFiles: File[] = [];
  trackingNumber: string | null = null;
  isSubmitting = false;
  isLoading = false;

  categories: { label: string; value: number }[] = [];
  modules: { label: string; value: number }[] = [];

  priorities = [
    { label: 'Critical', value: 'CRITICAL' },
    { label: 'High', value: 'HIGH' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'Low', value: 'LOW' }
  ];

  issueTypes = [
    { label: 'Small - 72 Hours', value: 'SMALL' },
    { label: 'Large - 144 Hours', value: 'LARGE' }
  ];

  notificationPrefs = [
    { label: 'Email', value: 'EMAIL' },
    { label: 'SMS', value: 'SMS' },
    { label: 'Both', value: 'BOTH' }
  ];

  constructor(
    private fb: FormBuilder,
    private itSupportService: ItSupportService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    this.requestForm = this.fb.group({
      issueTitle: ['', Validators.required],
      category: [null, Validators.required],
      priority: [null, Validators.required],
      issueType: [null, Validators.required],
      description: ['', Validators.required],
      module: [null, Validators.required],
      notification: [null]
    });
  }

  ngOnInit(): void {
    this.loadDropdowns();
  }

  private detectChanges(): void {
    this.cdr.detectChanges();
  }

  async loadDropdowns(): Promise<void> {
    this.isLoading = true;
    this.detectChanges();
    
    this.zone.runOutsideAngular(async () => {
      try {
        const categoryData = await this.itSupportService.getCategories();
        const moduleData = await this.itSupportService.getModules();

        this.zone.run(() => {
          this.categories = categoryData.map((cat: ITCategory) => ({
            label: cat.name,
            value: cat.id
          }));

          this.modules = moduleData.map((mod: ITModule) => ({
            label: mod.name,
            value: mod.id
          }));

          this.isLoading = false;
          this.detectChanges();
        });
      } catch (error) {
        console.error('Error loading dropdowns:', error);
        this.zone.run(() => {
          this.isLoading = false;
          this.detectChanges();
        });
      }
    });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = input.files ? Array.from(input.files) : [];
  }

  async onSubmit(): Promise<void> {
    if (this.requestForm.valid) {
      this.isSubmitting = true;
      this.detectChanges();
      
      const formValue = this.requestForm.value;

      try {
        const result = await this.itSupportService.createRequest({
          title: formValue.issueTitle,
          description: formValue.description,
          categoryId: formValue.category,
          moduleId: formValue.module,
          priority: formValue.priority,
          files: this.selectedFiles
        });

        if (result.success) {
          this.trackingNumber = result.trackingNumber || '';
          this.detectChanges();
          Swal.fire({
            icon: 'success',
            title: 'Request Submitted',
            html: `Your support request has been submitted successfully.<br><strong>Tracking Number: ${this.trackingNumber}</strong>`,
            confirmButtonColor: '#3085d6'
          });
          this.requestForm.reset();
          this.selectedFiles = [];
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Submission Failed',
            text: result.message || 'Failed to submit request. Please try again.',
            confirmButtonColor: '#d33'
          });
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'An unexpected error occurred. Please try again.',
          confirmButtonColor: '#d33'
        });
      } finally {
        this.isSubmitting = false;
        this.detectChanges();
      }
    } else {
      this.requestForm.markAllAsTouched();
    }
  }

  saveDraft(): void {
    Swal.fire({
      icon: 'info',
      title: 'Draft Saved',
      text: 'Your request has been saved as a draft.',
      confirmButtonColor: '#3085d6'
    });
  }
}

