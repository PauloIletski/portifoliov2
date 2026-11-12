import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { ContentKind, EditorRow } from './models';
import { Auth } from './auth';

@Injectable({ providedIn: 'root' })
export class Connection {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  list(kind: ContentKind, admin = false): Promise<EditorRow[]> {
    return this.request(this.http.get<EditorRow[]>(`/api/${admin ? 'admin/' : ''}content/${kind}`));
  }
  save(kind: ContentKind, payload: Omit<EditorRow, 'id'>, id?: string): Promise<EditorRow> {
    const url = `/api/admin/content/${kind}`;
    return this.request(
      id
        ? this.http.put<EditorRow>(`${url}/${id}`, payload)
        : this.http.post<EditorRow>(url, payload),
    );
  }
  remove(kind: ContentKind, id: string): Promise<{ id: string }> {
    return this.request(this.http.delete<{ id: string }>(`/api/admin/content/${kind}/${id}`));
  }
  async upload(file: File): Promise<string> {
    const { upload } = await import('./blob-upload');
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const result = await upload(`portfolio-images/${crypto.randomUUID()}.${extension}`, file, {
      access: 'public',
      handleUploadUrl: '/api/admin/uploads',
      contentType: file.type,
    });
    return result.url;
  }
  private async request<T>(operation: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(operation);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401)
        await this.auth.expireSession();
      if (error instanceof HttpErrorResponse)
        throw new Error(error.error?.message || 'Serviço indisponível. Tente novamente.');
      throw error;
    }
  }
}
