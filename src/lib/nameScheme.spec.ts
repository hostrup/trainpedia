import { describe, it, expect } from 'vitest';
import { resolveDisplayName, isNameScheme } from './nameScheme';

describe('isNameScheme', () => {
	it('accepterer gyldige skemaer', () => {
		expect(isNameScheme('TOPS')).toBe(true);
		expect(isNameScheme('HISTORICAL')).toBe(true);
		expect(isNameScheme('BUILDER')).toBe(true);
	});

	it('afviser ugyldige værdier', () => {
		expect(isNameScheme('NICKNAME')).toBe(false);
		expect(isNameScheme(undefined)).toBe(false);
		expect(isNameScheme(null)).toBe(false);
		expect(isNameScheme('')).toBe(false);
	});
});

describe('resolveDisplayName', () => {
	const aliases = [
		{ alias: 'English Electric Type 3', scheme: 'BUILDER' },
		{ alias: 'D6700', scheme: 'PRE_TOPS' },
		{ alias: 'Tractor', scheme: 'NICKNAME' }
	];

	it('bruger altid TOPS-navnet for skema TOPS', () => {
		expect(resolveDisplayName('British Rail Class 37', aliases, 'TOPS')).toBe(
			'British Rail Class 37'
		);
	});

	it('vælger BUILDER-alias for skema BUILDER', () => {
		expect(resolveDisplayName('British Rail Class 37', aliases, 'BUILDER')).toBe(
			'English Electric Type 3'
		);
	});

	it('falder tilbage til TOPS-navnet hvis intet BUILDER-alias findes', () => {
		expect(resolveDisplayName('British Rail Class 08', [], 'BUILDER')).toBe(
			'British Rail Class 08'
		);
	});

	it('foretrækker PRE_TOPS over ORIGINAL for skema HISTORICAL', () => {
		expect(resolveDisplayName('British Rail Class 37', aliases, 'HISTORICAL')).toBe('D6700');
	});

	it('falder tilbage til ORIGINAL for skema HISTORICAL hvis intet PRE_TOPS findes', () => {
		const originalOnly = [{ alias: 'GWR 3400 Class', scheme: 'ORIGINAL' }];
		expect(resolveDisplayName('British Rail Class 37', originalOnly, 'HISTORICAL')).toBe(
			'GWR 3400 Class'
		);
	});

	it('falder tilbage til TOPS-navnet for HISTORICAL hvis hverken PRE_TOPS eller ORIGINAL findes', () => {
		expect(resolveDisplayName('British Rail Class 91', [], 'HISTORICAL')).toBe(
			'British Rail Class 91'
		);
	});

	it('ignorerer NICKNAME-aliasser (ikke en valgbar visningsskema)', () => {
		const nicknameOnly = [{ alias: 'Tractor', scheme: 'NICKNAME' }];
		expect(resolveDisplayName('British Rail Class 37', nicknameOnly, 'BUILDER')).toBe(
			'British Rail Class 37'
		);
	});
});
