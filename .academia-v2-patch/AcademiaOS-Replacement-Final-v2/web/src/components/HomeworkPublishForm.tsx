"use client";

import { useMemo, useState } from "react";
import { BookPlus, Paperclip } from "lucide-react";
import { createHomeworkAction } from "@/app/actions/academics";

type SourceType = "WRITTEN" | "BOOK" | "UPLOAD" | "BOOK_AND_UPLOAD";

type Props = {
  years: Array<{ id: string; name: string }>;
  terms: Array<{ id: string; name: string; academicYearId: string }>;
  classes: Array<{ id: string; name: string; stream: string | null }>;
  subjects: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; name: string; classId: string; subjectId: string }>;
};

export function HomeworkPublishForm({ years, terms, classes, subjects, topics }: Props) {
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("WRITTEN");

  const filteredTerms = useMemo(
    () => academicYearId ? terms.filter((term) => term.academicYearId === academicYearId) : terms,
    [academicYearId, terms]
  );

  const filteredTopics = useMemo(
    () => classId && subjectId
      ? topics.filter((topic) => topic.classId === classId && topic.subjectId === subjectId)
      : [],
    [classId, subjectId, topics]
  );

  const usesBook = sourceType === "BOOK" || sourceType === "BOOK_AND_UPLOAD";
  const uploadRequired = sourceType === "UPLOAD" || sourceType === "BOOK_AND_UPLOAD";

  return (
    <section className="paper-card p-5">
      <h2 className="flex items-center gap-2 font-black">
        <BookPlus size={19}/>
        Publish homework
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Choose the class, subject and topic taught. A PDF or image can be attached to any homework.
      </p>

      <form action={createHomeworkAction} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <select className="input" name="academicYearId" value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)} required>
          <option value="">Select academic year</option>
          {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
        </select>

        <select className="input" name="termId" required>
          <option value="">Select term</option>
          {filteredTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
        </select>

        <select className="input" name="classId" value={classId} onChange={(event) => setClassId(event.target.value)} required>
          <option value="">Select class</option>
          {classes.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name} {schoolClass.stream || ""}</option>
          ))}
        </select>

        <select className="input" name="subjectId" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} required>
          <option value="">Select subject</option>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>

        <div className="sm:col-span-2 xl:col-span-4">
          <label className="mb-1 block text-xs font-black">Topic or topics taught</label>
          <select className="input min-h-32 w-full" name="topicIds" multiple required disabled={!classId || !subjectId}>
            {filteredTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </select>
          {!classId || !subjectId ? (
            <p className="mt-1 text-xs text-slate-500">Select the class and subject first.</p>
          ) : filteredTopics.length === 0 ? (
            <p className="mt-1 text-xs font-bold text-rose-700">No topics are configured. Add them under Homework topics.</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">Hold Ctrl on Windows or Cmd on Mac to select more than one topic.</p>
          )}
        </div>

        <input className="input sm:col-span-2" name="title" placeholder="Homework title" required/>
        <input className="input" name="dueDate" inputMode="numeric" placeholder="DD/MM/YYYY" pattern="[0-3][0-9]/[0-1][0-9]/[0-9]{4}" required/>
        <input className="input" name="dueTime" type="time" required/>
        <input className="input" name="maximumScore" type="number" min="0" step="0.01" placeholder="Maximum score"/>

        <select className="input sm:col-span-2 xl:col-span-3" name="sourceType" value={sourceType} onChange={(event) => setSourceType(event.target.value as SourceType)} required>
          <option value="WRITTEN">Typed instructions or questions</option>
          <option value="BOOK">Textbook or exercise book pages</option>
          <option value="UPLOAD">PDF, worksheet or image</option>
          <option value="BOOK_AND_UPLOAD">Book pages plus PDF or image</option>
        </select>

        {usesBook && <>
          <input className="input" name="bookTitle" placeholder="Book title" required/>
          <input className="input" name="pageReference" placeholder="Page or range, e.g. 44-46" required/>
        </>}

        <div className="sm:col-span-2 xl:col-span-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="mb-2 flex items-center gap-2 text-sm font-black">
            <Paperclip size={17}/>
            Attach homework file or image {uploadRequired ? "(required)" : "(optional)"}
          </label>
          <input className="input w-full bg-white" name="material" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required={uploadRequired}/>
          <p className="mt-2 text-xs text-slate-500">PDF, JPG, PNG or WebP. Maximum 3 MB.</p>
        </div>

        <textarea className="input min-h-32 sm:col-span-2 xl:col-span-4" name="instructions" placeholder="Homework instructions, questions, exercises or additional guidance" required/>
        <button className="btn-primary sm:col-span-2 xl:col-span-4">Publish homework to selected class</button>
      </form>
    </section>
  );
}
