import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import Swal from 'sweetalert2';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-excel-importing',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, BreadcrumbModule],
  templateUrl: './excel-importing.html',
  styleUrls: ['./excel-importing.scss'],
})
export class ExcelImporting implements OnInit {
  items: MenuItem[] | undefined;
  home: MenuItem | undefined;

  grievanceTypeOptions = [
    { label: 'Gender Based Violence', value: 'GBV' },
    { label: 'Non Gender Based Violence', value: 'NGBV' },
  ] as const;

  templateGrievanceType: 'GBV' | 'NGBV' | '' = '';
  uploadGrievanceType: 'GBV' | 'NGBV' | '' = '';
  selectedFile: File | null = null;
  isTemplateDownloading = false;
  isImporting = false;

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.items = [{ label: 'Excel File Importing' }];
    this.home = { icon: 'fas fa-home', routerLink: '/dashboard' };
  }

  onTemplateGrievanceTypeChange(value: string): void {
    const grievanceType = value === 'GBV' || value === 'NGBV' ? value : '';
    this.templateGrievanceType = grievanceType;
  }

  onUploadGrievanceTypeChange(value: string): void {
    const grievanceType = value === 'GBV' || value === 'NGBV' ? value : '';
    this.uploadGrievanceType = grievanceType;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] ?? null;
    if (!file) return;

    this.selectedFile = file;
  }

  async downloadTemplate(): Promise<void> {
    if (this.isTemplateDownloading) return;

    if (!this.templateGrievanceType) {
      Swal.fire({
        title: 'Info',
        text: 'Please select a template type first.',
        icon: 'info',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }
    

    this.isTemplateDownloading = true;
    this.cdr.detectChanges();
    this.showLoadingModal('Downloading Template', 'Please wait while the template file is being downloaded.');

    try {
      const res: any = await this.apiService.GET<Blob>(
        'api/grievance/import/template',
        { grievanceType: this.templateGrievanceType },
        'global',
        { responseType: 'blob' }
      );
      const fallbackName =
        this.templateGrievanceType === 'GBV' ? 'GBV_Import_Template.xlsx' : 'Non_GBV_Import_Template.xlsx';
      const filename = this.extractFilename(res.headers?.['content-disposition']) ?? fallbackName;
      this.saveBlob(res.data, filename);
      Swal.close();
    } catch (err: any) {
      Swal.close();
      const msg = err?.response?.data?.message || err?.response?.data?.detail || 'Failed to download template.';
      Swal.fire({ title: 'Error', text: msg, icon: 'error', confirmButtonColor: '#0d6efd' });
    } finally {
      this.isTemplateDownloading = false;
      this.cdr.detectChanges();
    }
  }

  async onImport(): Promise<void> {
    if (this.isImporting) return;

    if (!this.uploadGrievanceType) {
      Swal.fire({
        title: 'Info',
        text: 'Please select a grievance type first.',
        icon: 'info',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }

    if (!this.selectedFile) {
      Swal.fire({
        title: 'Info',
        text: 'Please upload an Excel file first.',
        icon: 'info',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }

    this.isImporting = true;
    this.cdr.detectChanges();
    this.showLoadingModal('Uploading File', 'Please wait while the Excel file is being imported.');

    const userId = this.getCurrentUserId();
    if (!userId) {
      this.isImporting = false;
      Swal.close();
      Swal.fire({
        title: 'Error',
        text: 'Could not resolve the current user for import.',
        icon: 'error',
        confirmButtonColor: '#0d6efd',
      });
      this.cdr.detectChanges();
      return;
    }

    const fd = new FormData();
    fd.append('file', this.selectedFile as File);

    const config = {
      params: { grievanceType: this.uploadGrievanceType },
      headers: { 'X-User-Id': userId },
    };

    try {
      const res: any = await this.apiService.POST('api/grievance/import', fd, 'global', config);
      Swal.close();

      const result = res?.data;
      const isSuccess = result?.code === 200 || result?.success === true || res?.status === 200;
      if (isSuccess) {
        Swal.fire({
          title: 'Success',
          text: result?.message || 'File imported successfully.',
          icon: 'success',
          confirmButtonColor: '#059669',
        });
        this.reset();
      } else {
        Swal.fire({
          title: 'Failed',
          text: result?.message || 'Failed to import data.',
          icon: 'error',
          confirmButtonColor: '#0d6efd',
        });
      }
    } catch (err: any) {
      Swal.close();
      const msg = err?.response?.data?.message || err?.response?.data?.detail || 'An error occurred while importing.';
      Swal.fire({ title: 'Error', text: msg, icon: 'error', confirmButtonColor: '#0d6efd' });
    } finally {
      this.isImporting = false;
      this.cdr.detectChanges();
    }
  }

  reset(): void {
    this.templateGrievanceType = '';
    this.uploadGrievanceType = '';
    this.selectedFile = null;
    this.isTemplateDownloading = false;
    this.isImporting = false;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  getImportButtonDisabledState(): boolean {
    return this.isImporting;
  }

  private getCurrentUserId(): string | null {
    const user = this.apiService.loginState()?.user;
    const userId = user?.sub ?? user?.id ?? user?.userId;
    return userId === null || userId === undefined || userId === '' ? null : String(userId);
  }

  private showLoadingModal(title: string, text: string): void {
    Swal.fire({
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
  }

  private extractFilename(contentDisposition?: string): string | null {
    if (!contentDisposition) return null;
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] ?? null;
  }

  private saveBlob(data: Blob, filename: string): void {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }
}
