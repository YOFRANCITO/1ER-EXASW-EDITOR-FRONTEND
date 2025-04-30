import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retryWhen, delay, scan } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiKey = 'gemini-api';

  private apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = {
      contents: [{
        parts: [{ text: message }]
      }]
    };
    console.log('Cuerpo de la solicitud (texto):', JSON.stringify(body, null, 2));
    return this.http.post(`${this.apiUrl}?key=${this.apiKey}`, body, { headers }).pipe(
      retryWhen(errors =>
        errors.pipe(
          scan((acc, error) => {
            if (acc > 3 || error.status !== 503) {
              throw error;
            }
            return acc + 1;
          }, 0),
          delay(1000)
        )
      ),
      catchError(error => {
        console.error('Error en GeminiService (texto):', error);
        if (error.error && error.error.error) {
          console.error('Detalles del error:', error.error.error);
        }
        return throwError(() => error);
      })
    );
  }

  sendMessageWithImage(prompt: string, base64Image: string, mimeType: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (!['image/png', 'image/jpeg'].includes(mimeType)) {
      console.error('Tipo MIME no soportado:', mimeType);
      return throwError(() => new Error('Tipo MIME no soportado. Usa PNG o JPEG.'));
    }

    let imageData = base64Image;
    if (imageData.includes(';base64,')) {
      imageData = imageData.split(';base64,')[1];
    }
    if (!imageData || !/^[A-Za-z0-9+/=]+$/.test(imageData)) {
      console.error('Datos base64 inválidos');
      return throwError(() => new Error('Datos base64 inválidos'));
    }

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: imageData
              }
            }
          ]
        }
      ]
    };

    console.log('Cuerpo de la solicitud (imagen):', JSON.stringify(body, null, 2));

    return this.http.post(`${this.apiUrl}?key=${this.apiKey}`, body, { headers }).pipe(
      retryWhen(errors =>
        errors.pipe(
          scan((acc, error) => {
            if (acc > 3 || error.status !== 503) {
              throw error;
            }
            return acc + 1;
          }, 0),
          delay(1000)
        )
      ),
      catchError(error => {
        console.error('Error en GeminiService al enviar imagen:', error);
        if (error.error && error.error.error) {
          console.error('Detalles del error:', error.error.error);
        }
        return throwError(() => error);
      })
    );
  }
}