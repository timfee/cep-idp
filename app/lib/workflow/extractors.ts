/**
 * Pull the X509 certificate string from Microsoft federation metadata XML.
 *
 * @param xmlString - Raw federation metadata XML
 * @returns PEM formatted certificate
 */
export function extractCertificateFromXml(xmlString: string): string {
  const signingBlockMatch = xmlString.match(
    /<KeyDescriptor[^>]*use="signing"[^>]*>[\s\S]*?<\/KeyDescriptor>/
  );
  if (!signingBlockMatch) {
    throw new Error("No signing certificate found in federation metadata");
  }

  const signingBlock = signingBlockMatch[0];
  const certMatch = signingBlock.match(
    /<X509Certificate[^>]*>([^<]+)<\/X509Certificate>/
  );
  if (!certMatch || !certMatch[1]) {
    throw new Error("Could not extract certificate from federation metadata");
  }

  const base64Cert = certMatch[1].trim().replace(/\s+/g, "");
  const pemCert = `-----BEGIN CERTIFICATE-----\n${base64Cert
    .match(/.{1,64}/g)
    ?.join("\n")}\n-----END CERTIFICATE-----`;
  return pemCert;
}
