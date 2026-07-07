import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('Rydder ikke-diesel klasser fra databasen...');
	const result = await prisma.locomotiveClass.deleteMany({
		where: {
			traction: {
				not: 'DIESEL'
			}
		}
	});
	console.log(`Færdig! Slettede ${result.count} ikke-diesel lokomotivklasser fra databasen.`);
}

main()
	.catch((err) => {
		console.error('Fejl under oprydning:', err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
