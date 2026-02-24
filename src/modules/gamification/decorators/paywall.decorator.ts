import { SetMetadata } from '@nestjs/common';

export const CHECK_PAYWALL_KEY = 'check_paywall';
// Este decorator vai marcar as rotas que precisam de validação de pagamento
export const CheckPaywall = () => SetMetadata(CHECK_PAYWALL_KEY, true);