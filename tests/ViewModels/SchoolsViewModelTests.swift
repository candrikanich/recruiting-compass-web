import XCTest
@testable import BaseballRecruitingTracker

final class SchoolsViewModelTests: XCTestCase {
    var sut: SchoolsViewModel!

    override func setUp() {
        super.setUp()
        sut = SchoolsViewModel()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    // MARK: - Search Tests

    func testFilteredSchoolsWithEmptySearch() {
        // Given
        let schools = [
            School(id: "1", name: "Duke", location: "Durham, NC", division: .D1, conference: "ACC", ranking: 5, isFavorite: false, website: nil, twitterHandle: nil, instagramHandle: nil, status: .interested, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date()),
            School(id: "2", name: "Florida", location: "Gainesville, FL", division: .D1, conference: "SEC", ranking: 3, isFavorite: true, website: nil, twitterHandle: nil, instagramHandle: nil, status: .contacted, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())
        ]
        sut.schools = schools
        sut.searchText = ""

        // When
        let filtered = sut.filteredSchools

        // Then
        XCTAssertEqual(filtered.count, 2)
        XCTAssertEqual(filtered[0].name, "Duke")
        XCTAssertEqual(filtered[1].name, "Florida")
    }

    func testFilteredSchoolsWithSearch() {
        // Given
        let schools = [
            School(id: "1", name: "Duke", location: "Durham, NC", division: .D1, conference: "ACC", ranking: 5, isFavorite: false, website: nil, twitterHandle: nil, instagramHandle: nil, status: .interested, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date()),
            School(id: "2", name: "Florida", location: "Gainesville, FL", division: .D1, conference: "SEC", ranking: 3, isFavorite: true, website: nil, twitterHandle: nil, instagramHandle: nil, status: .contacted, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())
        ]
        sut.schools = schools
        sut.searchText = "Duke"

        // When
        let filtered = sut.filteredSchools

        // Then
        XCTAssertEqual(filtered.count, 1)
        XCTAssertEqual(filtered[0].name, "Duke")
    }

    func testFilteredSchoolsSearchByLocation() {
        // Given
        let schools = [
            School(id: "1", name: "Duke", location: "Durham, NC", division: .D1, conference: "ACC", ranking: 5, isFavorite: false, website: nil, twitterHandle: nil, instagramHandle: nil, status: .interested, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date()),
            School(id: "2", name: "Florida", location: "Gainesville, FL", division: .D1, conference: "SEC", ranking: 3, isFavorite: true, website: nil, twitterHandle: nil, instagramHandle: nil, status: .contacted, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())
        ]
        sut.schools = schools
        sut.searchText = "Durham"

        // When
        let filtered = sut.filteredSchools

        // Then
        XCTAssertEqual(filtered.count, 1)
        XCTAssertEqual(filtered[0].name, "Duke")
    }

    // MARK: - Sorting Tests

    func testFilteredSchoolsSortedAlphabetically() {
        // Given
        let schools = [
            School(id: "1", name: "Zebra University", location: "Test, UT", division: .D1, conference: "Test", ranking: nil, isFavorite: false, website: nil, twitterHandle: nil, instagramHandle: nil, status: .interested, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date()),
            School(id: "2", name: "Alpha State", location: "Test, UT", division: .D1, conference: "Test", ranking: nil, isFavorite: false, website: nil, twitterHandle: nil, instagramHandle: nil, status: .interested, notes: nil, pros: nil, cons: nil, privateNotes: nil, offerDetails: nil, academicInfo: nil, amenities: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())
        ]
        sut.schools = schools

        // When
        let filtered = sut.filteredSchools

        // Then
        XCTAssertEqual(filtered[0].name, "Alpha State")
        XCTAssertEqual(filtered[1].name, "Zebra University")
    }
}
