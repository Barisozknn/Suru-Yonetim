import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Assistant from '../pages/Assistant';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollIntoView
(window.HTMLElement.prototype as any).scrollIntoView = vi.fn();

// Mock env
vi.stubGlobal('import.meta', { env: { VITE_DEEPSEEK_API_KEY: 'test_key' } });

describe('Faz 10: AI Asistan', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Sürünüzde 10 hayvan bulunmaktadır.'
            }
          }
        ]
      })
    }));
  });

  it('Asistan bileşeni render edilebilmeli ve girdi alanı mevcut olmalı', async () => {
    // Component render edilebilir mi kontrolü (Faz 16 UI güncellemesiyle uyumlu)
    render(<Assistant />);
    
    // Yeni Sohbet butonu mevcut olmalı (Faz 16 sidebar yapısı)
    expect(screen.getByText('Yeni Sohbet')).toBeInTheDocument();
    
    // Mesaj girdi alanı mevcut olmalı
    const input = screen.getByPlaceholderText('Yapay zekaya bir soru sorun...');
    expect(input).toBeInTheDocument();
  });
});
