interface ResourcesResource {
	Url: string;
}
interface ChangeResource {
	Id: string;
	Type: string;
	Url: string;
}
interface NumberIdResource {
	Id: number;
	Url: string;
}
interface StringIdResource {
	Id: string;
	Url: string;1
}

export interface Change {
	Id: string;
	Resource: ChangeResource; // Id, Type, Url
	Type: string;
	AddDate: string;
	extraData: string | null;
}

export interface APIv3BaseResponse {
	Resources?: {
		[path: string]: ResourcesResource; // Url
	}
	Url?: string;
	// If these exist, bad news.
	Status?: string;
	Code?: string;
	Message?: string;
	MessagePL?: string;
}

// https://api.librus.pl/3.0/PushChanges?pushDevice=<PUSH DEVICE>
export interface APIPushChanges extends APIv3BaseResponse {
	Changes: Change[];
	ChangesTimestamp: number;
}

// https://portal.librus.pl/api/v3/SynergiaAccounts/fresh/<LOGIN>
// login is Synergia login (e.g. 1233450u)
export interface APISynergiaAccountsFresh {
	id: number;
	accountIdentifier: string;
	group: string;
	accessToken: string;
	login: string;
	studentName: string;
	scopes: string;
	state: string;
}

// https://portal.librus.pl/api/v3/SynergiaAccounts
export interface APISynergiaAccounts {
	lastModification: number;
	accounts: APISynergiaAccountsFresh[];
}

// POST https://api.librus.pl/3.0/ChangeRegister
// also PUT https://api.librus.pl/3.0/ChangeRegister/<pushdevice id>?
// {"sendPush":"0","appVersion":"6.0.0"}
export interface PostAPIChangeRegister extends APIv3BaseResponse {
	ChangeRegister: NumberIdResource;
}

// https://api.librus.pl/3.0/Me
export interface APIMe extends APIv3BaseResponse {
	Me: {
		Account:{
			Id: number;
			UserId: number;
			FirstName: string;
			LastName: string;
			Email: string;
			GroupId: number;
			IsActive: boolean;
			Login: string;
			IsPremium: boolean;
			IsPremiumDemo: boolean;
			ExpiredPremiumDate: number;
		}
		Refresh: number;
		User: {
			FirstName: string;
			LastName: string;
		}
		Class: NumberIdResource; // Id, Url
	}
}

// https://api.librus.pl/3.0/SystemData
export interface APISystemData extends APIv3BaseResponse {
	Time: string;
	Date: string;
	Status?: string;
}

interface Category {
	Id: number;
	Teacher: NumberIdResource; // Id, Url
	Color: StringIdResource; // Id, Url
	Name: string;
	AdultsExtramural: boolean;
	AdultsDaily: boolean;
	Standard: boolean;
	IsReadOnly: string;
	CountToTheAverage: boolean;
	Weight: number;
	Short: string;
	BlockAnyGrades: boolean;
	ObligationToPerform: boolean;
}

// https://api.librus.pl/3.0/Grades/Categories/<Comma separated GradeCategory IDs?>
export interface APIGradesCategorie extends APIv3BaseResponse {
	Categorie: Category;
}
export interface APIGradesCategories extends APIv3BaseResponse {
	Categories: Category[];
}

export interface SchoolNotice {
	Id: string;
	StartDate: string;
	EndDate: string;
	Subject: string;
	Content: string;
	AddedBy: NumberIdResource // Id, Url
	CreationDate: string;
	WasRead: boolean;
}

// https://api.librus.pl/3.0/SchoolNotices/
export interface APISchoolNotices extends APIv3BaseResponse {
	SchoolNotices: SchoolNotice[];
}

// https://api.librus.pl/3.0/SchoolNotices/<SchoolNotice ID>
export interface APISchoolNotice extends APIv3BaseResponse {
	SchoolNotice: SchoolNotice;
}

interface Attendance {
	Id: number;
	Lesson: NumberIdResource; // Id, Url
	Student: NumberIdResource; // Id, Url
	Date: string;
	AddDate: string;
	LessonNo: number;
	Semester: number;
	Type: StringIdResource; // Id, Url
	AddedBy: NumberIdResource; // Id, Url
}

// https://api.librus.pl/3.0/Attendances/<Comma separated Attendance IDs>
export interface APIAttendance extends APIv3BaseResponse {
	Attendance: Attendance;
}
export interface APIAttendances extends APIv3BaseResponse {
	Attendances: Attendance[];
}

interface Homework {
	Id: number;
	Content: string;
	Date: string;
	Category: NumberIdResource; // Id, Url
	LessonNo: string;
	TimeFrom: string;
	TimeTo: string;
	AddDate: string;
	CreatedBy: NumberIdResource; // Id, Url
	Class: NumberIdResource; // Id, Url
	Subject: NumberIdResource; // Id, Url
}

// https://api.librus.pl/3.0/Homeworks/<Comma separated Homework IDs>
export interface APIHomework extends APIv3BaseResponse {
	Homework: Homework;
}
export interface APIHomeworks extends APIv3BaseResponse {
	Homeworks: Homework[];
}

interface Grade {
	Id: number;
	Lesson: NumberIdResource; // Id, Url
	Subject: NumberIdResource; // Id, Url
	Student: NumberIdResource; // Id, Url
	Category: NumberIdResource; // Id, Url
	AddedBy: NumberIdResource; // Id, Url
	Grade: string;
	Date: string;
	AddDate: string;
	Semester: number;
	IsConstituent: boolean;
	IsSemester: boolean;
	IsSemesterProposition: boolean;
	IsFinal: boolean;
	IsFinalProposition: boolean;
	Comments: StringIdResource[]; // Id, Url
}

interface GradeComment {
	Id: number;
	AddedBy: StringIdResource; // Id, Url
	Grade: StringIdResource; // Id, Url
	Text: string;
}

// https://api.librus.pl/3.0/Grades/<Comma separated Grade IDs>
export interface APIGrade extends APIv3BaseResponse {
	Grade: Grade;
}
export interface APIGrades extends APIv3BaseResponse {
	Grades: Grade[];
}

// https://api.librus.pl/3.0/Grades/Comments/<Comma separated Grade IDs>
export interface APIGradesComment extends APIv3BaseResponse {
	Comment: GradeComment;
}
export interface APIGradesComments extends APIv3BaseResponse {
	Comments: GradeComment[];
}

interface Lesson {
	Id: number;
	Teacher: NumberIdResource; // Id, Url
	Subject: NumberIdResource; // Id, Url
	Class: StringIdResource; // Id, Url
}

// https://api.librus.pl/3.0/Lessons/<Comma separated Lesson IDs>
export interface APILesson extends APIv3BaseResponse {
	Lesson: Lesson;
}
export interface APILessons extends APIv3BaseResponse {
	Lessons: Lesson[];
}

export interface TeacherFreeDay {
	Id: number;
	Name: string;
	DateFrom: string;
	DateTo: string;
	AddDate: string;
	Teacher: NumberIdResource // Id, Url
	TimeFrom: string;
	TimeTo: string;
}

// https://api.librus.pl/3.0/Calendars/TeacherFreeDays/<Comma separated IDs>
// https://api.librus.pl/2.0/TeacherFreeDays works too, but is not recommended since it doesnt give TimeFrom/TimeTo
export interface APICalendarsTeacherFreeDay extends APIv3BaseResponse {
	TeacherFreeDay: TeacherFreeDay;
}
export interface APICalendarsTeacherFreeDays extends APIv3BaseResponse {
	TeacherFreeDays: TeacherFreeDay[];
}

interface Substitution {
	Id: number;
	IsCancelled: boolean;
	IsShifted: boolean;
	OrgDate: string;
	OrgLessonNo: string;
	OrgSubject: NumberIdResource; // Id, Url
	OrgTeacher: NumberIdResource; // Id, Url
	Date?: string;
	LessonNo?: string;
	Subject?: NumberIdResource; // Id, Url
	Teacher?: NumberIdResource; // Id, Url
}

// https://api.librus.pl/3.0/Calendars/Substitutions/<Comma separated IDs>
export interface APICalendarsSubstitution extends APIv3BaseResponse {
	Substitution: Substitution;
}
export interface APICalendarsSubstitutions extends APIv3BaseResponse {
	Substitutions: Substitution[];
}

export interface User {
    Id: number;
    AccountId: string;
    FirstName: string;
    LastName: string;
    IsEmployee: boolean;
	GroupId?: number // What is this?
}

// https://api.librus.pl/3.0/Users/<Comma separated IDs>
export interface APIUser extends APIv3BaseResponse {
	User: User;
}
export interface APIUsers extends APIv3BaseResponse {
	Users: User[];
}

interface Subject {
	Id: number;
	Name: string;
	No: number;
	Short: string;
	IsExtracurricular: boolean;
	IsBlockLesson: boolean;
}

// https://api.librus.pl/2.0/Subjects/<Comma separated IDs>
export interface APISubject extends APIv3BaseResponse {
	Subject: Subject;
}
export interface APISubjects extends APIv3BaseResponse {
	Subjects: Subject[];
}

interface ParentTeacherConference {
	Class: NumberIdResource;
	Date: string;
	Name: string;
	Teacher: NumberIdResource;
	Topic: string;
	Room: null; // Probably NumberIdResource if defined?
	Time: string;
}

// https://api.librus.pl/3.0/ParentTeacherConferences/<ID>
export interface APIParentTeacherConference extends APIv3BaseResponse {
	ParentTeacherConference: ParentTeacherConference;
}
export interface APIParentTeacherConferences extends APIv3BaseResponse {
	ParentTeacherConferences: ParentTeacherConference[];
}

interface LuckyNumbers {
	LuckyNumber: number;
	LuckyNumberDay: string; // Date, format is YYYY-MM-DD
}

// https://api.librus.pl/3.0/LuckyNumbers/
export interface APILuckyNumbers extends APIv3BaseResponse {
	LuckyNumber: LuckyNumbers;
}

