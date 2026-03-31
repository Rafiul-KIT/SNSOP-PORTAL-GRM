import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import * as XLSX from 'xlsx';
import { validateFile } from '../../utils/file-validation.util';

@Component({
  selector: 'app-excel-importing',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, BreadcrumbModule],
  templateUrl: './excel-importing.html',
  styleUrls: ['./excel-importing.scss']
})
export class ExcelImporting implements OnInit {
  items: MenuItem[] | undefined;
  home: MenuItem | undefined;

  selectedGBVType: string = '';
  selectedFile: File | null = null;
  isAnalyzing = false;
  isImporting = false;
  isPreview = false;
  analysisData: { values: any[], error: string | null }[] = [];
  analysisErrors: string[] = [];
  previewHeaders: string[] = [];

    ngOnInit() {
    this.items = [{ label: 'Excel File Importing' }];
    this.home = { icon: 'fas fa-home', routerLink: '/dashboard' };
  }

  onFileChange(event: any): void {
    const file = validateFile(event, { checkExtension: false });
    if (!file) return;

    this.selectedFile = file;
    this.isPreview = false;
    this.analysisData = [];
    this.analysisErrors = [];
    this.previewHeaders = [];
  }

  downloadTemplate(): void {
    if (!this.selectedGBVType) {
      alert('Please select a template type first.');
      return;
    }

    let data: any[], fileName: string;

    if (this.selectedGBVType === 'type1') {
      fileName = 'Gender_Based_Violence_Template.xlsx';
      data = [
        ['ID', 'Date', 'Category', 'VictimGender', 'PerpetratorGender', 'Details'],
        ['1', '2024-01-15', 'Physical', 'Female', 'Male', 'Incident details here...']
      ];
    } else {
      fileName = 'Non_Gender_Based_Violence_Template.xlsx';
      data = [
        ['ID', 'Date', 'GrievanceType', 'Complainant', 'Status', 'Description'],
        ['1', '2024-01-20', 'Harassment', 'John Doe', 'Pending', 'Issue description here...']
      ];
    }

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, fileName);
  }

  onAnalyze(): void {
    if (!this.selectedFile) {
      alert('Please select a file to analyze.');
      return;
    }

    this.isAnalyzing = true;
    this.isPreview = false;
    this.analysisData = [];
    this.analysisErrors = [];
    this.previewHeaders = [];

    setTimeout(() => {
      const reader: FileReader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const bstr: string = e.target.result;
          const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
          const wsname: string = wb.SheetNames[0];
          const ws: XLSX.WorkSheet = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          this.validateAndPreview(data);
        } catch (error) {
          console.error('Error reading or parsing Excel file:', error);
          this.analysisErrors.push('Error reading or parsing the Excel file. Please ensure it is a valid Excel file.');
        } finally {
          this.isAnalyzing = false;
          this.isPreview = true;
        }
      };
      reader.readAsBinaryString(this.selectedFile as Blob);
    }, 2000);
  }

  validateAndPreview(data: any): void {
    this.analysisErrors = [];
    if (data.length < 2) {
      this.analysisErrors.push('The Excel file is empty or has only a header.');
      return;
    }

    const header = data[0];
    const expectedHeader = this.selectedGBVType === 'type1'
      ? ['ID', 'Date', 'Category', 'VictimGender', 'PerpetratorGender', 'Details']
      : ['ID', 'Date', 'GrievanceType', 'Complainant', 'Status', 'Description'];

    if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
      this.analysisErrors.push('Header mismatch. Please use the correct template.');
      this.analysisErrors.push(`Expected: ${expectedHeader.join(', ')}`);
      this.analysisErrors.push(`Found: ${header.join(', ')}`);
    } else {
      this.previewHeaders = header;
    }

    this.analysisData = data.slice(1).map((row: any, index: number) => {
      let error = null;
      if (this.selectedGBVType === 'type1' && typeof row[0] !== 'number') {
        error = 'Invalid data type for ID (expected number).';
      }
      return { values: row, error: error };
    });

    if (this.analysisData.some(d => d.error)) {
      this.analysisErrors.push('Some rows have data type errors. Please review the preview below.');
    }

    if (this.analysisErrors.length === 0) {
      this.analysisErrors.push('Analysis complete. No errors found. Ready to import.');
    }
  }

  onImport(): void {
    if (this.getImportButtonDisabledState()) { // Using the helper method
      alert('Please analyze the file and resolve errors before importing.');
      return;
    }

    this.isImporting = true;
    setTimeout(() => {
      this.isImporting = false;
      alert('Data imported successfully!');
      this.reset();
    }, 2000);
  }

  reset(): void {
    this.selectedGBVType = '';
    this.selectedFile = null;
    this.isAnalyzing = false;
    this.isImporting = false;
    this.isPreview = false;
    this.analysisData = [];
    this.analysisErrors = [];
    this.previewHeaders = [];
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  getAlertClass(): { [key: string]: boolean } {
    const hasDataErrors = this.analysisData.some(d => d.error);
    const hasHeaderMismatch = this.analysisErrors.some(e => e.startsWith('Header mismatch'));
    const isSuccessful = this.analysisErrors.length === 1 && !hasDataErrors && !hasHeaderMismatch; // "Analysis complete. No errors found. Ready to import."

    return {
      'alert-success': isSuccessful,
      'alert-danger': hasDataErrors || hasHeaderMismatch || (this.analysisErrors.length > 0 && !isSuccessful)
    };
  }

  getImportButtonDisabledState(): boolean {
    const hasDataErrors = this.analysisData.some(d => d.error);
    const hasHeaderMismatch = this.analysisErrors.some(e => e.startsWith('Header mismatch'));

    return this.isImporting || !this.isPreview || hasDataErrors || hasHeaderMismatch;
  }
}
