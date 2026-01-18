import XCTest
@testable import BaseballRecruitingTracker

final class DeepLinkHandlerTests: XCTestCase {
    var sut: DeepLinkHandler!

    override func setUp() {
        super.setUp()
        sut = DeepLinkHandler.shared
    }

    // MARK: - Custom Scheme Tests

    func testParseSchoolCustomScheme() {
        // Given
        let url = URL(string: "baseballrecruiting://school/123")!

        // When
        let deepLink = sut.parseURL(url)

        // Then
        XCTAssertEqual(deepLink, .school(id: "123"))
    }

    func testParseCoachCustomScheme() {
        // Given
        let url = URL(string: "baseballrecruiting://coach/456")!

        // When
        let deepLink = sut.parseURL(url)

        // Then
        XCTAssertEqual(deepLink, .coach(id: "456"))
    }

    func testParseInteractionCustomScheme() {
        // Given
        let url = URL(string: "baseballrecruiting://interaction/789")!

        // When
        let deepLink = sut.parseURL(url)

        // Then
        XCTAssertEqual(deepLink, .interaction(id: "789"))
    }

    func testParseEventCustomScheme() {
        // Given
        let url = URL(string: "baseballrecruiting://event/101112")!

        // When
        let deepLink = sut.parseURL(url)

        // Then
        XCTAssertEqual(deepLink, .event(id: "101112"))
    }

    func testParseSettingsCustomScheme() {
        // Given
        let url = URL(string: "baseballrecruiting://settings")!

        // When
        let deepLink = sut.parseURL(url)

        // Then
        XCTAssertEqual(deepLink, .settings)
    }

    // MARK: - Universal Link Tests

    func testParseSchoolUniversalLink() {
        // Given
        let url = URL(string: "https://baseballrecruiting.app/school/123")!

        // When
        let deepLink = sut.parseURL(url)

        // Then
        XCTAssertEqual(deepLink, .school(id: "123"))
    }

    func testParseCoachUniversalLink() {
        // Given
        let url = URL(string: "https://baseballrecruiting.app/coach/456")!

        // When
        let deepLink = sut.parseURL(url)

        // Then
        XCTAssertEqual(deepLink, .coach(id: "456"))
    }

    func testParseInteractionUniversalLink() {
        // Given
        let url = URL(string: "https://baseballrecruiting.app/interaction/789")!

        // When
        let deepLink = sut.parseURL(url)

        // Then
        XCTAssertEqual(deepLink, .interaction(id: "789"))
    }

    func testParseSettingsUniversalLink() {
        // Given
        let url = URL(string: "https://baseballrecruiting.app/settings")!

        // When
        let deepLink = sut.parseURL(url)

        // Then
        XCTAssertEqual(deepLink, .settings)
    }

    // MARK: - Invalid URL Tests

    func testParseInvalidScheme() {
        // Given
        let url = URL(string: "https://example.com/school/123")!

        // When
        let deepLink = sut.parseURL(url)

        // Then
        XCTAssertEqual(deepLink, .unknown)
    }

    func testParseCustomSchemeWithoutPath() {
        // Given
        let url = URL(string: "baseballrecruiting://")!

        // When
        let deepLink = sut.parseURL(url)

        // Then
        XCTAssertEqual(deepLink, .unknown)
    }

    func testParseEmptyID() {
        // Given
        let url = URL(string: "baseballrecruiting://school/")!

        // When
        let deepLink = sut.parseURL(url)

        // Then
        XCTAssertEqual(deepLink, .unknown)
    }
}
