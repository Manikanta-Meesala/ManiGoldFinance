package com.manigold.finance.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

public class InterestCalculator {

    public static class ActiveInterestResult {
        public long daysPassed;
        public long monthsPassed;
        public long extraDays;
        public String durationText;
        public double interestAccrued;
        public double totalPayable;
    }

    public static class ExternalInterestResult {
        public long daysPassed;
        public double runningInterest;
        public double totalOutstanding;
    }

    public static ActiveInterestResult calculateActiveInterest(String createdAtStr, double principal, double monthlyRate) {
        Instant createdInstant = parseInstant(createdAtStr);
        Instant now = Instant.now();

        long diffMillis = Math.max(0, Duration.between(createdInstant, now).toMillis());
        long daysPassed = (long) Math.ceil((double) diffMillis / (1000.0 * 60.0 * 60.0 * 24.0));

        long billableDays;
        if (daysPassed <= 15) {
            billableDays = 15;
        } else if (daysPassed <= 30) {
            billableDays = 30;
        } else {
            billableDays = daysPassed;
        }

        long months = billableDays / 30;
        long days = billableDays % 30;

        double interestAccrued = (principal * (monthlyRate / 100.0) * months) + (principal * (monthlyRate / 100.0) * ((double) days / 30.0));
        double totalPayable = principal + interestAccrued;

        String durationText;
        if (daysPassed <= 15) {
            durationText = "15 Days (Min)";
        } else if (daysPassed <= 30) {
            durationText = "1 Month (Min)";
        } else {
            durationText = String.format("%d Month%s %d Day%s", 
                    months, months != 1 ? "s" : "", 
                    days, days != 1 ? "s" : "");
        }

        ActiveInterestResult result = new ActiveInterestResult();
        result.daysPassed = daysPassed;
        result.monthsPassed = months;
        result.extraDays = days;
        result.durationText = durationText;
        result.interestAccrued = roundTwoDecimals(interestAccrued);
        result.totalPayable = roundTwoDecimals(totalPayable);
        return result;
    }

    public static ExternalInterestResult calculateExternalInterest(String createdAtStr, double principal, double monthlyRate, boolean receivedBack, String receivedBackDateStr) {
        Instant createdInstant = parseInstant(createdAtStr);
        Instant endInstant = (receivedBack && receivedBackDateStr != null && !receivedBackDateStr.isEmpty()) 
                ? parseInstant(receivedBackDateStr) 
                : Instant.now();

        long diffMillis = Math.max(0, Duration.between(createdInstant, endInstant).toMillis());
        long daysPassed = (long) Math.ceil((double) diffMillis / (1000.0 * 60.0 * 60.0 * 24.0));

        double interest = principal * (monthlyRate / 100.0) * ((double) daysPassed / 30.0);
        double outstanding = principal + interest;

        ExternalInterestResult result = new ExternalInterestResult();
        result.daysPassed = daysPassed;
        result.runningInterest = roundTwoDecimals(interest);
        result.totalOutstanding = roundTwoDecimals(outstanding);
        return result;
    }

    private static Instant parseInstant(String dateStr) {
        try {
            return Instant.parse(dateStr);
        } catch (Exception e) {
            try {
                return ZonedDateTime.parse(dateStr).toInstant();
            } catch (Exception ex) {
                return Instant.now();
            }
        }
    }

    public static double roundTwoDecimals(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
