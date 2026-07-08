export interface BlocklistEntry {
	qid: string;
	reason: string;
}

export const QID_BLOCKLIST: BlocklistEntry[] = [
	{
		qid: 'Q139989800',
		reason: 'New Enterprise Trains (ukildet, spekulativ post for årstal 2030)'
	},
	{
		qid: 'Q1213765',
		reason: 'NSB Di 8 (Norsk lokomotiv, uden for britisk jernbanekontekst)'
	}
];
