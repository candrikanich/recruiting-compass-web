import XCTest
@testable import BaseballRecruitingTracker

final class SchoolModelTests: XCTestCase {

    // MARK: - Codable Tests

    func testSchoolEncodingAndDecoding() throws {
        // Given
        let school = School(
            id: "1",
            name: "Duke University",
            location: "Durham, NC",
            division: .D1,
            conference: "ACC",
            ranking: 5,
            isFavorite: true,
            website: URL(string: "https://duke.edu"),
            twitterHandle: "@DukeBaseball",
            instagramHandle: "dukebaseball",
            status: .interested,
            notes: "Great baseball program",
            pros: ["Strong alumni", "Beautiful campus"],
            cons: ["Expensive"],
            privateNotes: "Private note",
            offerDetails: nil,
            academicInfo: nil,
            amenities: nil,
            createdBy: nil,
            updatedBy: nil,
            createdAt: Date(),
            updatedAt: Date()
        )

        // When
        let encoder = JSONEncoder()
        let data = try encoder.encode(school)

        let decoder = JSONDecoder()
        let decodedSchool = try decoder.decode(School.self, from: data)

        // Then
        XCTAssertEqual(school.id, decodedSchool.id)
        XCTAssertEqual(school.name, decodedSchool.name)
        XCTAssertEqual(school.division, decodedSchool.division)
        XCTAssertEqual(school.status, decodedSchool.status)
    }

    // MARK: - Identifiable Tests

    func testSchoolIdentifiable() {
        // Given
        let school = School(id: "123", name: "Test School", location: nil, division: nil, conference: nil, ranking: nil, isFavorite: false, website: nil, twitterHandle: nil, instagramHandle: nil, status: .researching, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())

        // When
        let id = school.id

        // Then
        XCTAssertEqual(id, "123")
    }

    // MARK: - Equatable Tests

    func testSchoolEquality() {
        // Given
        let school1 = School(id: "1", name: "Duke", location: "Durham, NC", division: .D1, conference: "ACC", ranking: 5, isFavorite: false, website: nil, twitterHandle: nil, instagramHandle: nil, status: .interested, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())
        let school2 = School(id: "1", name: "Duke", location: "Durham, NC", division: .D1, conference: "ACC", ranking: 5, isFavorite: false, website: nil, twitterHandle: nil, instagramHandle: nil, status: .interested, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())

        // When & Then
        XCTAssertEqual(school1, school2)
    }

    func testSchoolInequality() {
        // Given
        let school1 = School(id: "1", name: "Duke", location: "Durham, NC", division: .D1, conference: "ACC", ranking: 5, isFavorite: false, website: nil, twitterHandle: nil, instagramHandle: nil, status: .interested, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())
        let school2 = School(id: "2", name: "UNC", location: "Chapel Hill, NC", division: .D1, conference: "ACC", ranking: 8, isFavorite: false, website: nil, twitterHandle: nil, instagramHandle: nil, status: .researching, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())

        // When & Then
        XCTAssertNotEqual(school1, school2)
    }
}
