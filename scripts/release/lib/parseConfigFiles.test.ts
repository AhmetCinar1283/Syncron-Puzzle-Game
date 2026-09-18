/**
 * DOSYA AMACI: `.env` ve Java `.properties` ayrıştırıcılarının birim testleri.
 * Özellikle Windows yollarındaki ters bölü kaçışları — yanlış ayrıştırma,
 * `admobAppId`'yi "yok" göstererek kapıyı yanlış yerden tetiklerdi.
 */
import { describe, expect, it } from 'vitest';
import { parseDotEnv, parseJavaProperties } from './parseConfigFiles.mjs';

describe('parseDotEnv', () => {
  it('temel anahtar/değer okur', () => {
    expect(parseDotEnv('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('CRLF satır sonlarını ve BOM\'u temizler', () => {
    expect(parseDotEnv('\uFEFFFOO=bar\r\nBAZ=qux\r\n')).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('yorum ve boş satırları atlar', () => {
    expect(parseDotEnv('# yorum\n\n  # girintili yorum\nFOO=bar')).toEqual({ FOO: 'bar' });
  });

  it('yorumlanmış kimlik "tanımlı" sayılmaz', () => {
    // .env.local içinde AdMob kimlikleri bugün yorum satırında duruyor.
    expect(parseDotEnv('# NEXT_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-1/2')).toEqual({});
  });

  it('tırnakları soyar', () => {
    expect(parseDotEnv('A="x y"\nB=\'z\'')).toEqual({ A: 'x y', B: 'z' });
  });

  it('export önekini destekler', () => {
    expect(parseDotEnv('export FOO=bar')).toEqual({ FOO: 'bar' });
  });

  it('değer içindeki = işaretini korur', () => {
    expect(parseDotEnv('URL=https://a.b/?x=1&y=2')).toEqual({ URL: 'https://a.b/?x=1&y=2' });
  });

  it('boş değeri boş string olarak tutar', () => {
    expect(parseDotEnv('FOO=')).toEqual({ FOO: '' });
  });

  it('geçersiz girdide çökmez', () => {
    expect(parseDotEnv(undefined)).toEqual({});
    expect(parseDotEnv(null)).toEqual({});
    expect(parseDotEnv('')).toEqual({});
    expect(parseDotEnv('=degersiz-anahtar')).toEqual({});
  });
});

describe('parseJavaProperties', () => {
  it('Windows SDK yolundaki kaçışları çözer', () => {
    const text = 'sdk.dir=C\\:\\\\Users\\\\ahmet\\\\AppData\\\\Local\\\\Android\\\\Sdk';
    expect(parseJavaProperties(text)['sdk.dir']).toBe('C:\\Users\\ahmet\\AppData\\Local\\Android\\Sdk');
  });

  it('admobAppId satırını okur', () => {
    const text = '#Sun May 31\nsdk.dir=C\\:\\\\Sdk\nadmobAppId=ca-app-pub-1234567890123456~1234567890';
    expect(parseJavaProperties(text).admobAppId).toBe('ca-app-pub-1234567890123456~1234567890');
  });

  it('iki nokta ayırıcıyı destekler', () => {
    expect(parseJavaProperties('a:b')).toEqual({ a: 'b' });
  });

  it('# ve ! yorumlarını atlar', () => {
    expect(parseJavaProperties('# a=1\n! b=2\nc=3')).toEqual({ c: '3' });
  });

  it('ayırıcısı olmayan satırı yok sayar', () => {
    expect(parseJavaProperties('sadece-anahtar')).toEqual({});
  });

  it('geçersiz girdide çökmez', () => {
    expect(parseJavaProperties(undefined)).toEqual({});
    expect(parseJavaProperties('')).toEqual({});
  });
});
