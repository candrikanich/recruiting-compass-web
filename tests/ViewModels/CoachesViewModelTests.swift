import XCTest
@testable import BaseballRecruitingTracker

final class CoachesViewModelTests: XCTestCase {
    var sut: CoachesViewModel!

    override func setUp() {
        super.setUp()
        sut = CoachesViewModel()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    // MARK: - Search Tests

    func testFilteredCoachesWithEmptySearch() {
        // Given
        let coaches = [
            Coach(id: "1", schoolId: "1", role: .headCoach, firstName: "Mike", lastName: "Bianco", email: "mbianco@olemiss.edu", phone: "555-1234", twitterHandle: nil, instagramHandle: nil, notes: nil, privateNotes: nil, responsivenessScore: 4.5, lastContactDate: Date(), availability: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date()),
            Coach(id: "2", schoolId: "1", role: .assistant, firstName: "John", lastName: "Doe", email: "jdoe@olemiss.edu", phone: "555-5678", twitterHandle: nil, instagramHandle: nil, notes: nil, privateNotes: nil, responsivenessScore: 3.8, lastContactDate: Date(), availability: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())
        ]
        sut.coaches = coaches
        sut.searchText = ""

        // When
        let filtered = sut.filteredCoaches

        // Then
        XCTAssertEqual(filtered.count, 2)
    }

    func testFilteredCoachesSearchByName() {
        // Given
        let coaches = [
            Coach(id: "1", schoolId: "1", role: .headCoach, firstName: "Mike", lastName: "Bianco", email: "mbianco@olemiss.edu", phone: "555-1234", twitterHandle: nil, instagramHandle: nil, notes: nil, privateNotes: nil, responsivenessScore: 4.5, lastContactDate: Date(), availability: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date()),
            Coach(id: "2", schoolId: "1", role: .assistant, firstName: "John", lastName: "Smith", email: "jsmith@olemiss.edu", phone: "555-5678", twitterHandle: nil, instagramHandle: nil, notes: nil, privateNotes: nil, responsivenessScore: 3.8, lastContactDate: Date(), availability: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())
        ]
        sut.coaches = coaches
        sut.searchText = "Bianco"

        // When
        let filtered = sut.filteredCoaches

        // Then
        XCTAssertEqual(filtered.count, 1)
        XCTAssertEqual(filtered[0].lastName, "Bianco")
    }

    func testFilteredCoachesSearchByEmail() {
        // Given
        let coaches = [
            Coach(id: "1", schoolId: "1", role: .headCoach, firstName: "Mike", lastName: "Bianco", email: "mbianco@olemiss.edu", phone: "555-1234", twitterHandle: nil, instagramHandle: nil, notes: nil, privateNotes: nil, responsivenessScore: 4.5, lastContactDate: Date(), availability: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date()),
            Coach(id: "2", schoolId: "1", role: .assistant, firstName: "John", lastName: "Smith", email: "jsmith@olemiss.edu", phone: "555-5678", twitterHandle: nil, instagramHandle: nil, notes: nil, privateNotes: nil, responsivenessScore: 3.8, lastContactDate: Date(), availability: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())
        ]
        sut.coaches = coaches
        sut.searchText = "mbianco"

        // When
        let filtered = sut.filteredCoaches

        // Then
        XCTAssertEqual(filtered.count, 1)
        XCTAssertEqual(filtered[0].email, "mbianco@olemiss.edu")
    }

    func testFilteredCoachesBySchool() {
        // Given
        let coaches = [
            Coach(id: "1", schoolId: "1", role: .headCoach, firstName: "Mike", lastName: "Bianco", email: "mbianco@olemiss.edu", phone: "555-1234", twitterHandle: nil, instagramHandle: nil, notes: nil, privateNotes: nil, responsivenessScore: 4.5, lastContactDate: Date(), availability: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date()),
            Coach(id: "2", schoolId: "2", role: .assistant, firstName: "John", lastName: "Smith", email: "jsmith@ufl.edu", phone: "555-5678", twitterHandle: nil, instagramHandle: nil, notes: nil, privateNotes: nil, responsivenessScore: 3.8, lastContactDate: Date(), availability: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())
        ]
        sut.coaches = coaches
        sut.selectedSchoolId = "1"

        // When
        let filtered = sut.filteredCoaches

        // Then
        XCTAssertEqual(filtered.count, 1)
        XCTAssertEqual(filtered[0].schoolId, "1")
    }

    // MARK: - Sorting Tests

    func testFilteredCoachesSortedByLastName() {
        // Given
        let coaches = [
            Coach(id: "1", schoolId: "1", role: .headCoach, firstName: "Zachary", lastName: "Zebra", email: "zzebra@test.edu", phone: "555-1234", twitterHandle: nil, instagramHandle: nil, notes: nil, privateNotes: nil, responsivenessScore: 4.5, lastContactDate: Date(), availability: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date()),
            Coach(id: "2", schoolId: "1", role: .assistant, firstName: "Albert", lastName: "Alpha", email: "aalpha@test.edu", phone: "555-5678", twitterHandle: nil, instagramHandle: nil, notes: nil, privateNotes: nil, responsivenessScore: 3.8, lastContactDate: Date(), availability: nil, createdBy: nil, updatedBy: nil, createdAt: Date(), updatedAt: Date())
        ]
        sut.coaches = coaches

        // When
        let filtered = sut.filteredCoaches

        // Then
        XCTAssertEqual(filtered[0].lastName, "Alpha")
        XCTAssertEqual(filtered[1].lastName, "Zebra")
    }
}
