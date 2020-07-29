import React, { useState, useEffect } from "react";
import Pagination from "../misc/Pagination"

const Table = ({ data, handleEdit, handleDelete }) => {
  const [allRecord, setAllRecord] = useState(data);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordPerPage, setRecordPerPage] = useState(10);
  useEffect(() => {
  setAllRecord(data);
  }, [data]);

  //Sorting Ascending
  const handleAscSorting = (str) => {
    let ascSortedRecord = [...allRecord];
    ascSortedRecord.sort((a, b) => {
      if (a[str].toLowerCase() < b[str].toLowerCase()) return -1;
      if (a[str].toLowerCase() > b[str].toLowerCase()) return 1;
      return 0;
    });
    setAllRecord(ascSortedRecord);
  };
  //Sorting Descending
  const handleDesSorting = (str) => {
    let desSortedRecord = [...allRecord];
    desSortedRecord.sort((a, b) => {
      if (a[str].toLowerCase() < b[str].toLowerCase()) return 1;
      if (a[str].toLowerCase() > b[str].toLowerCase()) return -1;
      return 0;
    });
    setAllRecord(desSortedRecord);
  };
  //Paginatiosn
  //Get Current Records
  const indexOfLastRecord = currentPage * recordPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordPerPage;
  const currentRecords = allRecord.slice(indexOfFirstRecord, indexOfLastRecord);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  //Handle Search
  const handleSearch = (event) => {
    console.log(event.currentTarget.value);
    if (event.currentTarget.value && event.currentTarget.value !== "") {
      const searchInput = event.currentTarget.value.toLowerCase();
      let searchRecord = [...data];
      let result = [];
      for (var i = 0; i < searchRecord.length; i++) {
        //For Integer
        //searchRecord[i].INTEGER.toString().indexOf(searchInput)!==-1
        if (searchRecord[i].group_name.toLowerCase().indexOf(searchInput)!==-1) {
          result.push(searchRecord[i]);
        } else if (
          searchRecord[i].supervisor.name.toLowerCase().indexOf(searchInput)!==-1
        ) {
          result.push(searchRecord[i]);
        }
      }
      setAllRecord(result);
      console.log(result);
    } else {
      console.log("no results");
      setAllRecord(data);
    }
  };

  return (
    <>
     
      <section className="content">
        <div className="container-fluid">
          {data.length < 1 ? (
            <strong>Sorry! No matching record found!</strong>
          ) : (
            <div className="card-body table-responsive p-0">
              <div className="row">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header tdl-heading">
                      <h3></h3>
                      <div className="card-tools float-right">
                        <div className="input-group input-group-sm">
                          <form className="form-inline d-flex justify-content-center md-form form-sm">
                            <input
                              className="form-control"
                              type="search"
                              placeholder="Search"
                              aria-label="Search"
                              onChange={handleSearch}
                            />
                          </form>
                        </div>
                      </div>
                    </div>
                    {/* /.card-header */}
                    <div className="card-body table-responsive p-0">
                      <table className="table table-hover text-nowrap table-hover">
                        <thead>
                          <tr>
                            <th>
                              Group Name
                              <i
                                onClick={() => handleAscSorting("group_name")}
                                className="fa fa-arrow-up fa-xs float-right"
                                style={{
                                  cursor: "pointer",
                                }}
                              />
                              <i
                                onClick={() => handleDesSorting("group_name")}
                                className="fa fa-arrow-down fa-xs float-right"
                                style={{
                                  cursor: "pointer",
                                }}
                              />
                            </th>
                            <th>Supervisor</th>
                            <th>Members</th>
                            <th>Form Name</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentRecords.length > 0 &&
                            currentRecords.map((group, index) => {
                              return (
                                <tr key={index}>
                                  <td className="td-width">
                                    {" "}
                                    {group.group_name}
                                  </td>
                                  <td className="td-width">
                                    <img
                                      className="mr-3 rounded-circle"
                                      style={{ width: "50px" }}
                                      src={group.supervisor.icon}
                                      alt="icon"
                                    />
                                    {group.supervisor.name}
                                  </td>
                                  <td className="td-width">
                                    <button
                                      className="btn btn-light"
                                      onClick={() => {
                                        handleClickOpen(group.members);
                                        setTitle("Members");
                                      }}
                                    >
                                      {group.members.length}
                                    </button>
                                  </td>
                                  <td className="td-width">
                                    <button
                                      className="btn btn-light"
                                      onClick={() => {
                                        handleClickOpen(group.forms);
                                        setTitle("Forms ");
                                      }}
                                    >
                                      {group.forms.length}
                                    </button>
                                  </td>
                                  <td>
                                    <i
                                      onClick={() => handleEdit(group.id)}
                                      className="fa fa-edit fa-lg pr-2"
                                      style={{
                                        color: "#28a745",
                                        cursor: "pointer",
                                      }}
                                    ></i>
                                    <i
                                      onClick={() => handleDelete(group.id)}
                                      style={{
                                        color: "#bb2d38",
                                        cursor: "pointer",
                                      }}
                                      className="fa fa-trash-o fa-lg "
                                      aria-hidden="true"
                                    ></i>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                    {/* /.card-body */}
                    <div className="card-footer ">
                      <div className="row">
                        <div className="col-sm-12 col-md-5">
                          <div className="dataTables_info">
                            Showing{" "}
                            {currentRecords.length < 1
                              ? "0"
                              : indexOfFirstRecord + 1}{" "}
                            to{" "}
                            {indexOfLastRecord > currentRecords.length
                              ? currentRecords.length
                              : indexOfLastRecord}{" "}
                            of {data.length} entries
                          </div>
                        </div>
                        <div className="col-sm-12 col-md-7">
                          <Pagination
                            postsPerPage={recordPerPage}
                            totalPosts={data.length}
                            paginate={paginate}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* /.card */}
                </div>
              </div>
            </div>
          )}{" "}
          {/* /.card-body */}
        </div>
        {/* /.card */}
        {/* /.container-fluid */}
      </section>
    </>
  );
};
export default Table;
