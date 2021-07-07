import { Keystore } from '@chainsafe/bls-keystore';
import {SecretKey, init } from '@chainsafe/bls';

export async function generateKeystore(key: Buffer, password: string, path: string) {
  await init("blst-native");

  const publicKey = SecretKey.fromBytes(key).toPublicKey().toBytes();
  const keystore = await Keystore.create(password, Buffer.from(key), publicKey, path);

  if (!keystore) {
    throw new Error('unable to encrypt keystore');
  }

  await keystore.verifyPassword(password);
  return JSON.stringify(keystore.toObject(), null, 2);
}

self.onmessage = async ({data: {key, password, path}}) => {
  const keystoreStr = await generateKeystore(key, password, path);
  self.postMessage({keystoreStr});
};