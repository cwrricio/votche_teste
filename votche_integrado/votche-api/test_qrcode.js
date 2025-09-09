// Script de teste para validar a geração de QR Code
import QRCode from 'qrcode';

async function testQRCodeGeneration() {
    try {
        console.log('Testando geração de QR Code...');
        
        // Simular dados de uma reunião
        const meetingId = 1;
        const accessPin = '123456';
        const meetingUrl = `http://localhost:3000/join/${accessPin}`;
        
        console.log(`URL da reunião: ${meetingUrl}`);
        
        // Gerar QR Code
        const qrCodeDataURL = await QRCode.toDataURL(meetingUrl, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        console.log('QR Code gerado com sucesso!');
        console.log('Tamanho do QR Code (base64):', qrCodeDataURL.length);
        console.log('Prefixo do QR Code:', qrCodeDataURL.substring(0, 50) + '...');
        
        // Testar geração de QR Code como string
        const qrCodeString = await QRCode.toString(meetingUrl, {
            type: 'terminal'
        });
        
        console.log('\nQR Code como string (terminal):');
        console.log(qrCodeString);
        
        return true;
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        return false;
    }
}

// Executar teste
testQRCodeGeneration()
    .then(success => {
        if (success) {
            console.log('\n✅ Teste de geração de QR Code passou!');
        } else {
            console.log('\n❌ Teste de geração de QR Code falhou!');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Erro no teste:', error);
        process.exit(1);
    });

