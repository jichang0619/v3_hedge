// V3 LP Hedging Calculator - Core Logic
// Uniswap V3 수학 및 헷징 계산 로직

class UniswapV3Calculator {
    constructor() {
        this.isLoading = false;
    }

    /**
     * 유니스왑 V3 집중 유동성 수학
     * Reference: https://uniswap.org/whitepaper-v3.pdf
     */
    
    // 스퀘어 루트 가격 계산
    toSqrtPrice(price) {
        return Math.sqrt(price);
    }

    // 유동성 L 계산 (유니스왑 V3 정확한 공식)
    calculateLiquidity(entryPrice, lpAmount, lowerRange, upperRange) {
        const sqrtPa = this.toSqrtPrice(lowerRange);
        const sqrtPb = this.toSqrtPrice(upperRange);
        const sqrtP = this.toSqrtPrice(entryPrice);
        
        if (entryPrice < lowerRange || entryPrice > upperRange) {
            throw new Error('Entry price must be within the specified range');
        }
        
        // 유니스왑 V3에서 주어진 투자 금액으로 최대한의 유동성을 제공하는 공식
        // 투자 금액 = x * P + y (여기서 x는 토큰 수량, y는 USD 수량)
        // x = L * (1/√P - 1/√Pb), y = L * (√P - √Pa)
        // 따라서: lpAmount = L * (1/√P - 1/√Pb) * P + L * (√P - √Pa)
        //         lpAmount = L * [(1/√P - 1/√Pb) * P + (√P - √Pa)]
        //         lpAmount = L * [√P - P/√Pb + √P - √Pa]
        //         lpAmount = L * [2√P - P/√Pb - √Pa]
        
        const denominator = 2 * sqrtP - entryPrice / sqrtPb - sqrtPa;
        const liquidity = lpAmount / denominator;
        
        return liquidity;
    }

    // 현재 가격에서의 토큰 분배 계산
    calculateTokenDistribution(currentPrice, liquidity, lowerRange, upperRange) {
        const sqrtPa = this.toSqrtPrice(lowerRange);
        const sqrtPb = this.toSqrtPrice(upperRange);
        const sqrtP = this.toSqrtPrice(currentPrice);
        
        let tokenAmount, usdAmount;
        
        if (currentPrice <= lowerRange) {
            // 가격이 하한 아래로 떨어지면 모든 유동성이 토큰으로 전환
            tokenAmount = liquidity * (1/sqrtPa - 1/sqrtPb);
            usdAmount = 0;
        } else if (currentPrice >= upperRange) {
            // 가격이 상한 위로 올라가면 모든 유동성이 USD로 전환
            tokenAmount = 0;
            usdAmount = liquidity * (sqrtPb - sqrtPa);
        } else {
            // 가격이 범위 내에 있을 때
            tokenAmount = liquidity * (1/sqrtP - 1/sqrtPb);
            usdAmount = liquidity * (sqrtP - sqrtPa);
        }
        
        const totalValue = tokenAmount * currentPrice + usdAmount;
        
        return {
            tokenAmount: Math.max(0, tokenAmount),
            usdAmount: Math.max(0, usdAmount),
            totalValue: totalValue
        };
    }

    // 토큰 입력 기반 LP 포지션 계산 (유니스왑 스타일)
    calculateLPFromTokenInput(entryPrice, tokenAmount, lowerRange, upperRange, inputType = 'token') {
        try {
            const sqrtPa = this.toSqrtPrice(lowerRange);
            const sqrtPb = this.toSqrtPrice(upperRange);
            const sqrtP = this.toSqrtPrice(entryPrice);
            
            if (entryPrice < lowerRange || entryPrice > upperRange) {
                throw new Error('Entry price must be within the specified range');
            }
            
            let liquidity, finalTokenAmount, finalUsdAmount;
            
            if (inputType === 'token') {
                // ETH 입력 시: 입력된 ETH로부터 유동성과 필요한 USDC 계산
                liquidity = tokenAmount / (1/sqrtP - 1/sqrtPb);
                finalTokenAmount = tokenAmount;
                finalUsdAmount = liquidity * (sqrtP - sqrtPa);
            } else {
                // USDC 입력 시: 입력된 USDC로부터 유동성과 필요한 ETH 계산
                liquidity = tokenAmount / (sqrtP - sqrtPa);
                finalTokenAmount = liquidity * (1/sqrtP - 1/sqrtPb);
                finalUsdAmount = tokenAmount;
            }
            
            const totalValue = finalTokenAmount * entryPrice + finalUsdAmount;
            
            return {
                tokenAmount: finalTokenAmount,
                usdAmount: finalUsdAmount,
                totalValue: totalValue,
                liquidity: liquidity
            };
            
        } catch (error) {
            console.error('LP calculation error:', error);
            return {
                tokenAmount: 0,
                usdAmount: 0,
                totalValue: 0,
                liquidity: 0
            };
        }
    }

    // 완전한 LP 포지션 계산 (기존 방식 유지)
    calculateLPPosition(currentPrice, entryPrice, lpAmount, lowerRange, upperRange) {
        try {
            // 1. 초기 유동성 계산
            const liquidity = this.calculateLiquidity(entryPrice, lpAmount, lowerRange, upperRange);
            
            // 2. 초기 토큰 분배
            const initialDistribution = this.calculateTokenDistribution(entryPrice, liquidity, lowerRange, upperRange);
            
            // 3. 현재 가격에서의 토큰 분배
            const currentDistribution = this.calculateTokenDistribution(currentPrice, liquidity, lowerRange, upperRange);
            
            // 4. 초기 투자 가치 계산
            const initialTokenValue = initialDistribution.tokenAmount * entryPrice;
            const initialTotalValue = initialTokenValue + initialDistribution.usdAmount;
            
            // 5. HODL 가치 계산 - 더 정확한 유니스왑 V3 방식
            // 실제로 LP에 예치한 토큰 양을 기준으로 HODL 계산
            const hodlValue = initialDistribution.tokenAmount * currentPrice + initialDistribution.usdAmount;
            
            // 6. Impermanent Loss 계산
            // V3에서는 가격이 범위를 벗어나면 IL이 다르게 계산됨
            let impermanentLoss;
            
            if (currentPrice <= lowerRange) {
                // 가격이 하한 아래: 모든 자산이 토큰으로 전환됨
                // HODL vs LP에서 토큰만 보유하게 된 상황 비교
                const totalTokensInLP = currentDistribution.tokenAmount;
                const hodlTokensEquivalent = hodlValue / currentPrice; // HODL을 모두 토큰으로 환산
                impermanentLoss = (totalTokensInLP - hodlTokensEquivalent) * currentPrice;
            } else if (currentPrice >= upperRange) {
                // 가격이 상한 위: 모든 자산이 USD로 전환됨
                // HODL vs LP에서 USD만 보유하게 된 상황 비교
                const totalUsdInLP = currentDistribution.usdAmount;
                impermanentLoss = totalUsdInLP - hodlValue;
            } else {
                // 가격이 범위 내: 일반적인 IL 계산
                impermanentLoss = currentDistribution.totalValue - hodlValue;
            }
            
            return {
                tokenAmount: currentDistribution.tokenAmount,
                usdAmount: currentDistribution.usdAmount,
                totalValue: currentDistribution.totalValue,
                impermanentLoss: impermanentLoss,
                hodlValue: hodlValue,
                liquidity: liquidity,
                initialTokenAmount: initialDistribution.tokenAmount,
                initialUsdAmount: initialDistribution.usdAmount,
                initialTotalValue: initialTotalValue
            };
            
        } catch (error) {
            console.error('LP Position calculation error:', error);
            return {
                tokenAmount: 0,
                usdAmount: 0,
                totalValue: 0,
                impermanentLoss: 0,
                hodlValue: 10000, // 기본값
                liquidity: 0,
                initialTokenAmount: 0,
                initialUsdAmount: 0,
                initialTotalValue: 10000
            };
        }
    }

    // 숏 포지션 손익 계산
    calculateShortPnL(currentPrice, entryPrice, shortSize) {
        if (shortSize <= 0) return 0;
        
        // 숏 손익 = 숏 크기 * (1 - 현재가격/진입가격)
        // 가격이 떨어지면 이익, 올라가면 손실
        return shortSize * (1 - currentPrice / entryPrice);
    }

    // 최적 숏 포지션 크기 계산 (델타 헷징 기반)
    calculateOptimalShortSize(entryPrice, lpAmount, lowerRange, upperRange) {
        try {
            const liquidity = this.calculateLiquidity(entryPrice, lpAmount, lowerRange, upperRange);
            const sqrtP = this.toSqrtPrice(entryPrice);
            const sqrtPb = this.toSqrtPrice(upperRange);
            
            // 델타 계산 (가격 민감도)
            // 대략적인 델타 = 현재 토큰 보유량
            const tokenDistribution = this.calculateTokenDistribution(entryPrice, liquidity, lowerRange, upperRange);
            const delta = tokenDistribution.tokenAmount;
            
            // 최적 숏 크기 = 델타 * 현재 가격 (USD 기준)
            const optimalShort = delta * entryPrice;
            
            // 합리적인 범위로 제한 (LP 금액의 20-80%)
            return Math.min(Math.max(optimalShort, lpAmount * 0.2), lpAmount * 0.8);
            
        } catch (error) {
            console.error('Optimal short calculation error:', error);
            return lpAmount * 0.25; // 기본값: 25%
        }
    }

    // 시장 상황별 숏 포지션 계산
    calculateMarketBasedShortSizes(entryPrice, lpAmount, lowerRange, upperRange) {
        try {
            const normalShort = this.calculateOptimalShortSize(entryPrice, lpAmount, lowerRange, upperRange);
            
            // Bull Market: 상승 확률이 높으므로 헷징을 줄여서 상승 수익 극대화
            const bullShort = normalShort * 0.7; // 30% 감소
            
            // Bear Market: 하락 위험이 높으므로 헷징을 늘려서 하락 보호 강화
            const bearShort = normalShort * 1.4; // 40% 증가
            
            // LP 금액 범위 내로 제한
            return {
                bull: Math.min(Math.max(bullShort, lpAmount * 0.1), lpAmount * 0.6),
                normal: normalShort,
                bear: Math.min(Math.max(bearShort, lpAmount * 0.3), lpAmount * 0.9)
            };
            
        } catch (error) {
            console.error('Market-based short calculation error:', error);
            return {
                bull: lpAmount * 0.2,
                normal: lpAmount * 0.25,
                bear: lpAmount * 0.35
            };
        }
    }
}

// 유틸리티 함수들
class CalculatorUtils {
    // 숫자 포맷팅
    static formatNumber(num, decimals = 2) {
        // 극소값은 0으로 처리
        if (Math.abs(num) < 1e-10) {
            return '0';
        }
        
        // 매우 작은 값은 고정소수점으로
        if (Math.abs(num) < 0.0001 && num !== 0) {
            return num.toFixed(6);
        }
        
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals
        }).format(num);
    }

    // 통화 포맷팅 (항상 정확한 금액 표시)
    static formatCurrency(num) {
        // 극소값은 0으로 처리
        if (Math.abs(num) < 1e-10) {
            return '$0';
        }
        
        // 모든 금액을 정확히 표시
        if (Math.abs(num) < 1) {
            return `$${this.formatNumber(num, 4)}`;
        } else if (Math.abs(num) < 1000) {
            return `$${this.formatNumber(num, 2)}`;
        } else {
            return `$${this.formatNumber(num, 2)}`;
        }
    }

    // 컴팩트 통화 포맷팅 (테이블용 - 필요시에만 사용)
    static formatCurrencyCompact(num) {
        if (Math.abs(num) < 1e-10) {
            return '$0';
        }
        
        if (Math.abs(num) >= 1000000) {
            return `$${this.formatNumber(num / 1000000, 2)}M`;
        }
        if (Math.abs(num) >= 1000) {
            return `$${this.formatNumber(num / 1000, 1)}K`;
        }
        return `$${this.formatNumber(num, 2)}`;
    }

    // 퍼센트 포맷팅
    static formatPercent(num, decimals = 2) {
        return `${num >= 0 ? '+' : ''}${this.formatNumber(num, decimals)}%`;
    }

    // 색상 클래스 결정
    static getColorClass(value) {
        if (value > 0) return 'positive';
        if (value < 0) return 'negative';
        return 'neutral';
    }

    // 입력 검증
    static validateInputs(entryPrice, lpAmount, lowerRange, upperRange, shortSize) {
        const errors = [];
        
        if (entryPrice <= 0) errors.push('Entry price must be positive');
        if (lpAmount <= 0) errors.push('LP amount must be positive');
        if (shortSize < 0) errors.push('Short size cannot be negative');
        if (lowerRange >= entryPrice) errors.push('Lower range must be below entry price');
        if (upperRange <= entryPrice) errors.push('Upper range must be above entry price');
        if (lowerRange >= upperRange) errors.push('Lower range must be below upper range');
        
        return errors;
    }
}

// 토큰 가격 API 클래스
class TokenPriceAPI {
    static async fetchTokenPrice(tokenId) {
        try {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data[tokenId] || !data[tokenId].usd) {
                throw new Error('Price data not found');
            }
            
            return data[tokenId].usd;
            
        } catch (error) {
            console.error('Token price fetch error:', error);
            throw error;
        }
    }

    static getTokenList() {
        return [
            { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
            { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
            { id: 'uniswap', name: 'Uniswap', symbol: 'UNI' },
            { id: 'chainlink', name: 'Chainlink', symbol: 'LINK' },
            { id: 'matic-network', name: 'Polygon', symbol: 'MATIC' },
            { id: 'solana', name: 'Solana', symbol: 'SOL' },
            { id: 'custom', name: 'Custom', symbol: 'CUSTOM' }
        ];
    }
}

// 테이블 데이터 생성기
class TableDataGenerator {
    constructor(calculator) {
        this.calculator = calculator;
    }

    generatePriceScenarios(entryPrice, range, step) {
        const scenarios = [];
        const ranges = {
            narrow: 25,
            medium: 50,
            wide: 75,
            extreme: 100
        };

        const steps = {
            fine: 2.5,
            normal: 5,
            coarse: 10
        };

        const maxRange = ranges[range] || 50;
        const stepSize = steps[step] || 5;

        for (let i = -maxRange; i <= maxRange; i += stepSize) {
            scenarios.push({
                price: entryPrice * (1 + i/100),
                changePercent: i
            });
        }

        return scenarios;
    }

    generateTableData(entryPrice, lpAmount, lowerRange, upperRange, shortSize, priceRange, stepSize) {
        const scenarios = this.generatePriceScenarios(entryPrice, priceRange, stepSize);
        const results = [];

        scenarios.forEach(scenario => {
            const lpResult = this.calculator.calculateLPPosition(
                scenario.price, entryPrice, lpAmount, lowerRange, upperRange
            );
            
            const shortPnL = this.calculator.calculateShortPnL(
                scenario.price, entryPrice, shortSize
            );

            // LP P&L = 현재 LP 가치 - 초기 투자 금액
            const lpPnL = lpResult.totalValue - lpAmount;
            
            // Net P&L = LP P&L + Short P&L
            const netPnL = lpPnL + shortPnL;
            
            // Return = Net P&L / 초기 투자 금액
            const returnPct = (netPnL / lpAmount) * 100;

            results.push({
                price: scenario.price,
                priceChange: scenario.changePercent,
                tokenAmount: lpResult.tokenAmount,
                usdAmount: lpResult.usdAmount,
                totalValue: lpResult.totalValue,
                lpPnL: lpPnL,
                shortPnL: shortPnL,
                netPnL: netPnL,
                returnPct: returnPct,
                isCurrentPrice: Math.abs(scenario.changePercent) < 0.01
            });
        });

        return results;
    }
}

// 글로벌 인스턴스 생성
window.calculator = new UniswapV3Calculator();
window.utils = CalculatorUtils;
window.tokenAPI = TokenPriceAPI;
window.tableGenerator = new TableDataGenerator(window.calculator);