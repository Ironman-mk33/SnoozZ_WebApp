from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.hazmat.backends import default_backend

pfx_file = './ssl/cert.pfx'
password = b'mypassword'

with open(pfx_file, 'rb') as file:
  pfx_data = file.read()

private_key, certificate, _ = pkcs12.load_key_and_certificates(
  pfx_data, 
  password, 
  default_backend()
  )

private_key_pem = private_key.private_bytes(
  encoding=serialization.Encoding.PEM,
  format=serialization.PrivateFormat.PKCS8,
  encryption_algorithm=serialization.NoEncryption()
  )

certificate_pem = certificate.public_bytes(
  encoding=serialization.Encoding.PEM
  )

with open('./cert.pem', 'w', encoding='utf-8') as certificate_file:
  certificate_file.write(certificate_pem.decode('utf-8'))

with open('./privkey.pem', 'w', encoding='utf-8') as private_key_file:
  private_key_file.write(private_key_pem.decode('utf-8'))