import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction,
  Connection,
  Keypair,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const printSimulate = (owner: PublicKey, transaction: Transaction) => {
  transaction.feePayer = owner;
  transaction.recentBlockhash = TOKEN_PROGRAM_ID.toBase58();

  return transaction
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString('base64');
};

export const sendAndConfirm = async (props: {
  connection: Connection;
  owner: Keypair;
  instructions: TransactionInstruction[];
}) => {
  const { connection, owner, instructions } = props;

  const transaction = new Transaction();
  instructions.forEach(ins => {
    transaction.add(ins);
  });

  let error: string | undefined;
  try {
    await sendAndConfirmTransaction(connection, transaction, [owner], {
      commitment: 'confirmed',
    });
  } catch (e) {
    error = (e as any).message;
  }

  return { error, transaction };
};
