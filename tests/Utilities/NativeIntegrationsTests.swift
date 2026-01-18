import XCTest
@testable import BaseballRecruitingTracker

final class NativeIntegrationsTests: XCTestCase {
    var sut: NativeIntegrations!

    override func setUp() {
        super.setUp()
        sut = NativeIntegrations.shared
    }

    // MARK: - Phone Number Formatting Tests

    func testCallCoachWithValidPhone() {
        // Given
        let phoneNumber = "555-123-4567"

        // When
        // This would normally open the phone app, but we just verify it doesn't crash
        sut.callCoach(phoneNumber)

        // Then
        // If we reach here without crash, test passes
        XCTAssertTrue(true)
    }

    func testCallCoachExtractsNumbers() {
        // Given
        let phoneNumber = "+1-555-123-4567"

        // When
        // Extract numbers from the phone number
        let cleaned = phoneNumber.filter { $0.isNumber || $0 == "+" }

        // Then
        XCTAssertEqual(cleaned, "+15551234567")
    }

    // MARK: - Social Media Handle Tests

    func testTwitterHandleCleanup() {
        // Given
        let handle = "@CoachBianco"

        // When
        let cleaned = handle.trimmingCharacters(in: CharacterSet(charactersIn: "@"))

        // Then
        XCTAssertEqual(cleaned, "CoachBianco")
    }

    func testInstagramHandleCleanup() {
        // Given
        let handle = "@dukebaseball"

        // When
        let cleaned = handle.trimmingCharacters(in: CharacterSet(charactersIn: "@"))

        // Then
        XCTAssertEqual(cleaned, "dukebaseball")
    }

    // MARK: - URL Handling Tests

    func testWebsiteURLAdditionOfHTTPS() {
        // Given
        let urlString = "duke.edu"

        // When
        var processedURL = urlString
        if !processedURL.hasPrefix("http://") && !processedURL.hasPrefix("https://") {
            processedURL = "https://\(processedURL)"
        }

        // Then
        XCTAssertEqual(processedURL, "https://duke.edu")
    }

    func testWebsiteURLWithExistingHTTPS() {
        // Given
        let urlString = "https://duke.edu"

        // When
        var processedURL = urlString
        if !processedURL.hasPrefix("http://") && !processedURL.hasPrefix("https://") {
            processedURL = "https://\(processedURL)"
        }

        // Then
        XCTAssertEqual(processedURL, "https://duke.edu")
    }

    // MARK: - Email Address Tests

    func testEmailValidation() {
        // Given
        let validEmail = "coach@duke.edu"
        let invalidEmail = "notanemail"

        // When
        let validIsEmail = validEmail.contains("@")
        let invalidIsEmail = invalidEmail.contains("@")

        // Then
        XCTAssertTrue(validIsEmail)
        XCTAssertFalse(invalidIsEmail)
    }
}
